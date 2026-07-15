import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../domain/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Security Check: The request object is populated by the JwtAuthGuard which 
    // cryptographically verifies the JWT signature before this guard runs.
    // By extracting the user role from the verified JWT payload rather than 
    // trusting client input (e.g. body or query params), we prevent privilege escalation.
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!requiredRoles.includes(request.user?.role as UserRole)) {
      throw new ForbiddenException('You do not have permission to perform this action. Required roles: ' + requiredRoles.join(', '));
    }

    return true;
  }
}
