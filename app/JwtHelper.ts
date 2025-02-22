import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { generateKeyPairSync, KeyObject, createPrivateKey, createPublicKey } from 'crypto';
import * as fs from 'fs';
class JwtHelper {
    private static _instance: JwtHelper;
    private readonly privateKey: KeyObject;
    private readonly publicKey: KeyObject;
    private static readonly privateKeyPath = './data/jwt/private.key';
    private static readonly publicKeyPath = './data/jwt/public.key';

    constructor() {
        if (fs.existsSync(JwtHelper.privateKeyPath) && fs.existsSync(JwtHelper.publicKeyPath)) {
            this.privateKey = createPrivateKey(fs.readFileSync(JwtHelper.privateKeyPath));
            this.publicKey = createPublicKey(fs.readFileSync(JwtHelper.publicKeyPath));
        } else {
            const { privateKey, publicKey } = this.generateKeys();
            this.privateKey = privateKey;
            this.publicKey = publicKey;
            fs.writeFileSync(JwtHelper.privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
            fs.writeFileSync(JwtHelper.publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));
        }
    }
    public issueToken(payload: object, expiresInSeconds: number): string {
        const signOptions: SignOptions = {
            expiresIn: expiresInSeconds,
            algorithm: 'RS256',
            issuer: 'skibot',
        };
        return jwt.sign(payload, this.privateKey, signOptions);
    }


    public verifyToken(token: string | undefined): object | null {
        try {
            if (!token) return null;

            const decoded = jwt.verify(token, this.publicKey, {
                algorithms: ['RS256'],
            } as VerifyOptions);
            
            if (typeof decoded === 'object' && decoded !== null) {
                return decoded;
            }

            return null;
        } catch (error) {
            console.error('JWT verification error:', (error as Error).message);
            return null;
        }
    }


    private generateKeys(): { privateKey: KeyObject, publicKey: KeyObject } {
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        return { privateKey, publicKey };
    }
}

const jwtHelper = new JwtHelper();

export default jwtHelper;