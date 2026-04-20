import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Roles } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { user } = request;
    if (!user) {
      return false;
    }

    if (user.roles) {
      return this.matchRoles(roles, user.roles);
    }

    if (user.role) {
      return this.matchRole(roles, user.role);
    }

    return false;
  }

  private matchRoles(allowedRoles: string[], userRoles: string[]): boolean {
    return allowedRoles.every(role => userRoles.includes(role));
  }

  private matchRole(allowedRoles: string[], userRole: string): boolean {
    return allowedRoles.includes(userRole);
  }
}
