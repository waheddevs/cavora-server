export interface AccountEmail {
  email: string;
  url: string;
}

export interface AccountEmailAdapter {
  sendPasswordReset(input: AccountEmail): Promise<void>;
  sendVerification(input: AccountEmail): Promise<void>;
}

export class MemoryAccountEmailAdapter implements AccountEmailAdapter {
  public readonly passwordResets: AccountEmail[] = [];
  public readonly verifications: AccountEmail[] = [];

  public async sendPasswordReset(input: AccountEmail): Promise<void> {
    this.passwordResets.push(input);
  }

  public async sendVerification(input: AccountEmail): Promise<void> {
    this.verifications.push(input);
  }

  public clear(): void {
    this.passwordResets.length = 0;
    this.verifications.length = 0;
  }
}

export const accountEmailAdapter = new MemoryAccountEmailAdapter();
