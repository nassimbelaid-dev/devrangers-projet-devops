const assert=require('node:assert/strict')
const fs=require('node:fs')
const Module=require('node:module')
const path=require('node:path')
const ts=require('typescript')
const root=process.cwd()
const oldResolve=Module._resolveFilename
Module._resolveFilename=function(spec,parent,...args){
 if(spec.startsWith('@/')) spec=path.join(root,'src',spec.slice(2))
 if(fs.existsSync(spec+'.ts'))spec+='.ts'
 return oldResolve.call(this,spec,parent,...args)
}
Module._extensions['.ts']=function(m,filename){const source=fs.readFileSync(filename,'utf8');const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;m._compile(transpiled,filename)}
const business=require(root+'/src/lib/demo-business.ts')
function load(p){return require(root+'/src/features/'+p+'/mock-data.ts')}
const init={meetings:load('meetings').initialMeetings, members:load('members').initialMembers, decisions:load('decisions').initialDecisions, actions:load('decisions').initialActions,ballots:load('votes').initialBallots,documents:load('documents').initialDocuments,minutes:load('documents').initialMinutes,agenda:load('agenda').initialAgendaProposals,notifications:load('notifications').initialNotifications}
let s={...init}, count=0
function check(t){ assert(t);count++ }
function update(key,val){const r=business.applyDemoChange(s,key,val);if(!r.error) s=r.state;return r}
let linked=update('agenda',s.agenda.map(p=>p.id==='a3'?{...p,status:'Validé',order:5}:p));check(!linked.error);check(s.meetings.find(m=>m.id==='r1').agenda.some(p=>p.id==='a3'&&p.status==='Validé'));
let moved=update('agenda',s.agenda.map(p=>p.id==='a2'?{...p,status:'Rejeté',order:null}:p));check(!moved.error);check(!s.meetings.find(m=>m.id==='r1').agenda.some(p=>p.id==='a2'));
let reverted=update('agenda',s.agenda.map(p=>p.id==='a2'?{...p,status:'Proposé',order:null}:p));check(!reverted.error);check(s.meetings.find(m=>m.id==='r1').agenda.some(p=>p.id==='a2' &&p.status==='Proposé'));
let newM={id:'r-test', title:'Réunion test',date:'2026-11-29',startTime:'10:00',endTime:'11:00', location:'Salle X',description:'',status:'Planifiée',participantIds:[],agenda:[{id:'point-test',title:'Sujet test',proposedById:'m1',status:'Proposé'}]};
check(!update('meetings',[...s.meetings,newM]).error);check(s.agenda.some(p=>p.meetingId==='r-test' && p.id==='point-test'));
check(s.notifications.some(n=>n.kind==='convocation'&&n.context.includes('r-test')));
let upM={...newM,title:'Réunion corrigée',agenda:[{...newM.agenda[0],title:'Sujet corrigé'}]};check(!update('meetings',s.meetings.map(m=>m.id==='r-test'?upM:m)).error);check(s.agenda.some(p=>p.id==='point-test'&&p.title==='Sujet corrigé'));
check(!update('meetings',s.meetings.filter(m=>m.id!=='r-test')).error);check(!s.agenda.some(p=>p.meetingId==='r-test'));
const oldMemberCount=s.members.length;
const blocked=update('members',s.members.filter(m=>m.id!=='m3'));check(Boolean(blocked.error));check(s.members.length===oldMemberCount);
const blockedDecision=update('decisions',s.decisions.filter(d=>d.id!=='d3'));check(Boolean(blockedDecision.error));
const ballot=s.ballots.find(b=>b.id==='vote-1');
const startNotifications=s.notifications.length;
check(!update('ballots',s.ballots.map(b=>b.id===ballot.id?{...b,state:'Clôturé'}:b)).error);
check(s.decisions.find(d=>d.id==='d3').status==='Adoptée');check(s.notifications.length>startNotifications);
check(!update('ballots',s.ballots.map(b=>b.id===ballot.id?{...b,state:'Ouvert'}:b)).error);
check(s.decisions.find(d=>d.id==='d3').status==='En attente');
const newAction={id:'test-action', title:'Action créée',description:'',decisionId:'d1',assigneeId:'m3',dueDate:'2026-11-30',priority:'Normale', status:'À faire',order:10};
check(!update('actions',[...s.actions,newAction]).error);check(s.notifications.some(n=>n.context==='Action test-action'&&n.kind==='echeance-action'));
let invalid={...newAction,id:'bad-action',decisionId:'unknown'};check(Boolean(update('actions',[...s.actions,invalid]).error));check(!s.actions.some(a=>a.id==='bad-action'));
let updated=s.meetings.map(m=>m.id==='r1'?{...m,agenda:[...m.agenda,{id:'a-extra',title:'Nouveau point',proposedById:'m3',status:'Proposé'}]}:m);
check(!update('meetings',updated).error);check(s.agenda.some(p=>p.id==='a-extra'));
console.log('Tests réussis :',count,'vérifications (agenda, votes, notifications, suppressions).')
