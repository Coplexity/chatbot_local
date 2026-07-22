import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from "@nestjs/common";

export const parseImagePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: 1000 * 1000 * 5 }),
    new FileTypeValidator({ fileType: "image/*" }),
  ],
});
