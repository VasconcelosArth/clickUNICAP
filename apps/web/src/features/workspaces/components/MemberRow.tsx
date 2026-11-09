import { MEMBER_ROLE_LABELS, MEMBER_ROLES, type MemberRole, type MemberWithUser } from '@clickunicap/shared';
import { Avatar, Badge, ConfirmAction, Select } from '@/components/ui';

interface MemberRowProps {
  member: MemberWithUser;
  isMe: boolean;
  isAdmin: boolean;
  onChangeRole: (role: MemberRole) => void;
  onRemove: () => void;
  removing: boolean;
}

const destructiveTrigger = {
  variant: 'ghost',
  size: 'sm',
  className: 'text-red-800 dark:text-red-400',
} as const;

export function MemberRow({ member, isMe, isAdmin, onChangeRole, onRemove, removing }: MemberRowProps) {
  const canRemove = isAdmin && !member.isOwner && !isMe;
  const canLeave = isMe && !member.isOwner;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
      <td className="p-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={member.name} avatarUrl={member.avatarUrl} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
              <span className="truncate">{member.name}</span>
              {member.isOwner && <Badge tone="violet">Dono</Badge>}
            </div>
            <div className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate">{member.email}</div>
          </div>
        </div>
      </td>
      <td className="p-2">
        <Select
          aria-label={`Papel de ${member.name}`}
          value={member.role}
          disabled={!isAdmin || member.isOwner}
          onChange={(event) => onChangeRole(event.target.value as MemberRole)}
        >
          {MEMBER_ROLES.map((role) => (
            <option key={role} value={role}>
              {MEMBER_ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </td>
      <td className="p-2 text-right">
        {canRemove && (
          <ConfirmAction
            label="Remover"
            ariaLabel={`Remover ${member.name}`}
            question={`Remover ${member.name} do workspace?`}
            confirmLabel="Remover"
            pending={removing}
            onConfirm={onRemove}
            triggerProps={destructiveTrigger}
          />
        )}
        {canLeave && (
          <ConfirmAction
            label="Sair"
            question="Sair deste workspace?"
            confirmLabel="Sair"
            pending={removing}
            onConfirm={onRemove}
            triggerProps={destructiveTrigger}
          />
        )}
      </td>
    </tr>
  );
}
