import { AdvisorResponse } from '../../../core/models/advisor-backend.model';

export function getAdvisorFullName(advisor: AdvisorResponse): string {
  if (advisor.user) {
    return `${advisor.user.firstName} ${advisor.user.lastName}`;
  }
  return 'Sin nombre';
}

export function getAdvisorInitials(advisor: AdvisorResponse): string {
  if (advisor.user) {
    return `${advisor.user.firstName.charAt(0)}${advisor.user.lastName.charAt(0)}`.toUpperCase();
  }
  return '??';
}
