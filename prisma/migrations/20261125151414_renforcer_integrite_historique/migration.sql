BEGIN;

-- Validate existing data before installing deferred checks on future writes.
LOCK TABLE public.ballots, public.ballot_votes, public.ballot_results IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.ballots b
        WHERE (b.state = 'CLOSED') <> EXISTS (
            SELECT 1 FROM public.ballot_results r WHERE r.ballot_id = b.id
        )
    ) THEN
        RAISE EXCEPTION 'Existing ballot/result states are inconsistent' USING ERRCODE = '23514';
    END IF;
END;
$$;

CREATE FUNCTION public.reject_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is forbidden on %', TG_OP, TG_TABLE_NAME USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.reject_history_mutation();

CREATE FUNCTION public.protect_closed_ballot() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.state = 'CLOSED' THEN
        RAISE EXCEPTION 'A closed ballot is immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'A ballot id is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ballots_protect_closed
BEFORE UPDATE OR DELETE ON public.ballots
FOR EACH ROW EXECUTE FUNCTION public.protect_closed_ballot();

CREATE FUNCTION public.protect_ballot_child() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    parent_id uuid;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.ballot_id IS DISTINCT FROM OLD.ballot_id THEN
            RAISE EXCEPTION 'A vote or result cannot be reassigned to another ballot' USING ERRCODE = '23514';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN parent_id := OLD.ballot_id;
    ELSE parent_id := NEW.ballot_id;
    END IF;

    -- Create a new row version as well as taking a write lock. A closer using
    -- an older REPEATABLE READ or SERIALIZABLE snapshot must retry.
    UPDATE public.ballots SET state = state WHERE id = parent_id AND state = 'OPEN';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Votes and results can only be written on an open ballot' USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ballot_votes_protect_closed
BEFORE INSERT OR UPDATE OR DELETE ON public.ballot_votes
FOR EACH ROW EXECUTE FUNCTION public.protect_ballot_child();

CREATE TRIGGER ballot_results_protect_closed
BEFORE INSERT OR UPDATE OR DELETE ON public.ballot_results
FOR EACH ROW EXECUTE FUNCTION public.protect_ballot_child();

CREATE FUNCTION public.check_ballot_result_state() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    parent_id uuid;
    is_closed boolean;
BEGIN
    IF TG_TABLE_NAME = 'ballots' THEN
        parent_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        parent_id := OLD.ballot_id;
    ELSE
        parent_id := NEW.ballot_id;
    END IF;

    SELECT state = 'CLOSED' INTO is_closed FROM public.ballots WHERE id = parent_id;
    IF FOUND AND is_closed <> EXISTS (
        SELECT 1 FROM public.ballot_results WHERE ballot_id = parent_id
    ) THEN
        RAISE EXCEPTION 'A ballot must have a result exactly when closed' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ballots_check_result_state
AFTER INSERT OR UPDATE ON public.ballots
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.check_ballot_result_state();

CREATE CONSTRAINT TRIGGER ballot_results_check_state
AFTER INSERT OR DELETE ON public.ballot_results
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.check_ballot_result_state();

CREATE FUNCTION public.protect_final_decision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status NOT IN ('ADOPTED', 'REJECTED') THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL
            AND NEW.archived_by_account_id IS NOT NULL
            AND (to_jsonb(NEW) - ARRAY['archived_at', 'archived_by_account_id', 'archived_by_name'])
                = (to_jsonb(OLD) - ARRAY['archived_at', 'archived_by_account_id', 'archived_by_name'])
            AND EXISTS (
                SELECT 1 FROM public.meetings
                WHERE id = OLD.meeting_id AND status IN ('CLOSED', 'MINUTES_SIGNED')
            )
        THEN
            RETURN NEW;
        END IF;
    END IF;
    RAISE EXCEPTION 'A final decision is immutable except for its initial archival' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER decisions_protect_final
BEFORE UPDATE OR DELETE ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.protect_final_decision();

CREATE FUNCTION public.protect_signed_minutes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status NOT IN ('SIGNED', 'ARCHIVED') THEN RETURN OLD; END IF;
    ELSE
        IF OLD.status NOT IN ('SIGNED', 'ARCHIVED') AND NEW.status <> 'ARCHIVED' THEN
            RETURN NEW;
        END IF;
        IF OLD.status = 'SIGNED' AND NEW.status = 'ARCHIVED'
            AND NEW.archived_by_account_id IS NOT NULL
            AND NEW.version::bigint - OLD.version BETWEEN 0 AND 1
            AND (to_jsonb(NEW) - ARRAY['status', 'archived_at', 'archived_by_account_id', 'archived_by_name', 'updated_at', 'version'])
                = (to_jsonb(OLD) - ARRAY['status', 'archived_at', 'archived_by_account_id', 'archived_by_name', 'updated_at', 'version'])
        THEN
            RETURN NEW;
        END IF;
    END IF;
    RAISE EXCEPTION 'Signed or archived minutes are immutable except for initial archival' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER meeting_minutes_protect_signed
BEFORE UPDATE OR DELETE ON public.meeting_minutes
FOR EACH ROW EXECUTE FUNCTION public.protect_signed_minutes();

CREATE FUNCTION public.protect_notification_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Notifications must be withdrawn logically' USING ERRCODE = '23514';
    END IF;
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'A withdrawn notification is immutable' USING ERRCODE = '23514';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['read_at', 'archived_at', 'deleted_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['read_at', 'archived_at', 'deleted_at'])
    THEN
        RAISE EXCEPTION 'Only notification lifecycle timestamps can be changed' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_protect_history
BEFORE UPDATE OR DELETE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.protect_notification_history();

CREATE TRIGGER audit_events_reject_truncate
BEFORE TRUNCATE ON public.audit_events
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_history_mutation();

CREATE TRIGGER ballots_reject_truncate
BEFORE TRUNCATE ON public.ballots
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_history_mutation();

CREATE TRIGGER ballot_votes_reject_truncate
BEFORE TRUNCATE ON public.ballot_votes
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_history_mutation();

CREATE TRIGGER ballot_results_reject_truncate
BEFORE TRUNCATE ON public.ballot_results
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_history_mutation();

CREATE TRIGGER decisions_reject_truncate
BEFORE TRUNCATE ON public.decisions
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_history_mutation();

CREATE TRIGGER meeting_minutes_reject_truncate
BEFORE TRUNCATE ON public.meeting_minutes
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_history_mutation();

CREATE TRIGGER notifications_reject_truncate
BEFORE TRUNCATE ON public.notifications
FOR EACH STATEMENT EXECUTE FUNCTION public.reject_history_mutation();

COMMIT;
