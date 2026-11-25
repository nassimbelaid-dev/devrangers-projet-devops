"use client"

import { useParams } from "next/navigation"

const en: Record<string, string> = {
  "Associez ce compte à un membre du comité avec un siège valide.":
    "Link this account to a committee member with a valid seat.",
  Administration: "Administration",
  "Comptes et rôles": "Accounts and roles",
  "Gérez les comptes fictifs et attribuez un rôle. Les droits associés sont définis dans la configuration RBAC.":
    "Manage demo accounts and assign roles. Associated access is defined in the RBAC configuration.",
  "Comptes ({count})": "Accounts ({count})",
  Désactivé: "Disabled",
  Actif: "Active",
  Modifier: "Edit",
  Supprimer: "Delete",
  "Membre associé": "Linked member",
  "Impossible de désactiver le dernier administrateur actif.":
    "The last active administrator cannot be disabled.",
  "État du compte mis à jour.": "Account status updated.",
  "Aucun compte fictif.": "No demo accounts.",
  "Modifier le compte": "Edit account",
  "Ajouter un compte": "Add account",
  Prénom: "First name",
  Nom: "Last name",
  "Adresse e-mail": "Email address",
  "Mot de passe fictif": "Demo password",
  Rôle: "Role",
  "Membre associé (siège et éligibilité au vote)":
    "Linked member (seat and voting eligibility)",
  "Aucun membre associé": "No linked member",
  "Compte actif": "Account active",
  "Droits attribués selon le rôle": "Access granted by role",
  Enregistrer: "Save",
  Annuler: "Cancel",
  "Ces modifications restent dans le stockage local de ce navigateur. Les rôles de démonstration associés aux sièges votants sont configurés dans le fichier RBAC.":
    "These changes remain in this browser's local storage. Demo roles linked to voting seats are configured in the RBAC settings.",
  "Modification refusée : vérifiez les permissions, les doublons et la présence d'un administrateur actif.":
    "Change rejected. Check permissions, duplicate emails, and that an active administrator remains.",
  "Suppression refusée : le dernier administrateur actif doit être conservé.":
    "Deletion rejected. At least one active administrator must remain.",
  "Cette adresse e-mail est déjà utilisée.":
    "This email address is already in use.",
  Titulaire: "Full member",
  Suppléant: "Alternate",
  "Le compte fictif a été enregistré.": "Demo account saved.",
  "Le compte fictif a été supprimé.": "Demo account deleted.",
  Administrateur: "Administrator",
  "Président du comité": "Committee president",
  Secrétaire: "Secretary",
  "Responsable des archives": "Archivist",
  "Membre du comité": "Committee member",
  "Membre suppléante": "Alternate committee member",
  dashboard: "Dashboard",
  meetings: "Meetings",
  members: "Members",
  agenda: "Agenda",
  votes: "Votes",
  actions: "Actions",
  documents: "Documents",
  notifications: "Notifications",
  profile: "Profile",
  users: "Users",
}

const ar: Record<string, string> = {
  "Associez ce compte à un membre du comité avec un siège valide.":
    "اربط هذا الحساب بعضو في اللجنة يشغل مقعداً صالحاً.",
  Administration: "الإدارة",
  "Comptes et rôles": "الحسابات والأدوار",
  "Gérez les comptes fictifs et attribuez un rôle. Les droits associés sont définis dans la configuration RBAC.":
    "أدر الحسابات التجريبية وعيّن الأدوار. تُحدد الصلاحيات المرتبطة بها في إعدادات التحكم بالوصول.",
  "Comptes ({count})": "الحسابات ({count})",
  Désactivé: "معطّل",
  Actif: "نشط",
  Modifier: "تعديل",
  Supprimer: "حذف",
  "Membre associé": "العضو المرتبط",
  "Impossible de désactiver le dernier administrateur actif.":
    "لا يمكن تعطيل آخر حساب مسؤول نشط.",
  "État du compte mis à jour.": "تم تحديث حالة الحساب.",
  "Aucun compte fictif.": "لا توجد حسابات تجريبية.",
  "Modifier le compte": "تعديل الحساب",
  "Ajouter un compte": "إضافة حساب",
  Prénom: "الاسم الأول",
  Nom: "اسم العائلة",
  "Adresse e-mail": "البريد الإلكتروني",
  "Mot de passe fictif": "كلمة مرور تجريبية",
  Rôle: "الدور",
  "Membre associé (siège et éligibilité au vote)":
    "العضو المرتبط (المقعد وأهلية التصويت)",
  "Aucun membre associé": "لا يوجد عضو مرتبط",
  "Compte actif": "الحساب نشط",
  "Droits attribués selon le rôle": "الصلاحيات حسب الدور",
  Enregistrer: "حفظ",
  Annuler: "إلغاء",
  "Ces modifications restent dans le stockage local de ce navigateur. Les rôles de démonstration associés aux sièges votants sont configurés dans le fichier RBAC.":
    "تُحفظ هذه التغييرات في التخزين المحلي لهذا المتصفح. تُضبط أدوار المقاعد المصوتة في إعدادات RBAC.",
  "Modification refusée : vérifiez les permissions, les doublons et la présence d'un administrateur actif.":
    "رُفض التعديل. تحقق من الصلاحيات وعدم تكرار البريد وبقاء مسؤول نشط.",
  "Suppression refusée : le dernier administrateur actif doit être conservé.":
    "رُفض الحذف. يجب الإبقاء على مسؤول نشط واحد على الأقل.",
  "Cette adresse e-mail est déjà utilisée.":
    "هذا البريد الإلكتروني مستخدم بالفعل.",
  Titulaire: "عضو أصيل",
  Suppléant: "عضو بديل",
  "Le compte fictif a été enregistré.": "تم حفظ الحساب التجريبي.",
  "Le compte fictif a été supprimé.": "تم حذف الحساب التجريبي.",
  Administrateur: "مسؤول",
  "Président du comité": "رئيس اللجنة",
  Secrétaire: "أمين السر",
  "Responsable des archives": "مسؤول الأرشيف",
  "Membre du comité": "عضو اللجنة",
  "Membre suppléante": "عضوة بديلة",
  dashboard: "لوحة المعلومات",
  meetings: "الاجتماعات",
  members: "الأعضاء",
  agenda: "جدول الأعمال",
  votes: "التصويت",
  actions: "الإجراءات",
  documents: "الوثائق",
  notifications: "الإشعارات",
  profile: "الملف الشخصي",
  users: "المستخدمون",
}

export function useUsersText() {
  const params = useParams<{ lang?: string }>()
  const dictionary = params.lang === "ar" ? ar : params.lang === "en" ? en : {}
  return (source: string, values: Record<string, string | number> = {}) => {
    let value = dictionary[source] ?? source
    for (const [key, replacement] of Object.entries(values))
      value = value.replaceAll(`{${key}}`, String(replacement))
    return value
  }
}
