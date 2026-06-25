import {
  IsOptional, IsString, IsNumber, IsInt, IsBoolean,
  IsUUID, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(300) slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) price?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) stockQty?: number;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
