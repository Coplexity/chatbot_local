import { Injectable } from "@nestjs/common";
import { EntityClassOrSchema } from "@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type";
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { DataSource } from "typeorm";

export function IsUnique(
  entityClass: EntityClassOrSchema,
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [entityClass, property],
      validator: IsUniqueConstraint,
    });
  };
}

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly dataSource: DataSource) { }

  async validate(value: any, args: ValidationArguments) {
    const [entityClass, property] = args.constraints;
    const repository = this.dataSource.getRepository(entityClass);

    const record = await repository.findOne({
      where: { [property]: value },
    });
    return !record; // Return true if no record is found, meaning the value is unique
  }

  defaultMessage(args: ValidationArguments) {
    const [, property] = args.constraints;
    return `${property} must be unique.`;
  }
}
