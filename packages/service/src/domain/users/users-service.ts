import { Service } from 'typedi';
import { UsersRepository } from '@service/domain/users/users-repository';
import { User } from '@service/domain/users/user';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

@Service()
class UsersService {
  constructor(private repository: UsersRepository) { }

  async getByName(name: string): Promise<User | null> {
    return this.repository.findByName(name);
  }

  async getByApiToken(apiToken: string): Promise<User | null> {
    return this.repository.findByApiToken(apiToken);
  }

  async setPassword(password: string, user: User): Promise<void> {
    const salt = nanoid(64);
    const hashedPassword = await UsersService.hashPassword(password, salt);
    const apiToken = nanoid(32);

    const newUser: User = {
      ...user,
      password: {
        hashedPassword,
        salt,
        apiToken,
      },
    };

    this.repository.replace(newUser);
  }

  static hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const iterations = 50000;
      const keylen = 64;
      const digest = 'sha512';

      crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, key) => {
        if (err) {
          reject(err);
        } else {
          resolve(key.toString('hex'));
        }
      });
    });
  }

  static async checkPassword(password: string, user: User): Promise<boolean> {
    if (!user.password) return false;

    const hashedRequestPassword = await UsersService.hashPassword(password, user.password.salt);
    return hashedRequestPassword === user.password.hashedPassword;
  }
}

export { UsersService };
