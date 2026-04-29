import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SendMessageDto {
  @ApiProperty({
    description: "Message content from the user",
    maxLength: 5000,
    example: "I have a headache and fever for the past two days",
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;
}
