import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SignInDto } from "./auth.dto";

describe("SignInDto", () => {
  it("requires username and normalizes it as the lookup identifier", async () => {
    const dto = plainToInstance(SignInDto, {
      username: "T11@Example.com ",
      password: "password123",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.username).toBe("t11@example.com");
  });

  it("rejects email-only sign-in payloads", async () => {
    const dto = plainToInstance(SignInDto, {
      email: "T11@Example.com ",
      password: "password123",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("username");
  });
});
