import * as iwc from "./iwebcrypto";
import * as key from "./key";
import * as native from "./native_key";
let base64url = require("base64url");

export interface IAlgorithmBase {
    generateKey(alg: iwc.IAlgorithmIdentifier, extractable: boolean, keyUsages: string[]): iwc.ICryptoKey | iwc.ICryptoKeyPair;
    sign(alg: iwc.IAlgorithmIdentifier, key: key.CryptoKey, data: Buffer);
    verify(alg: iwc.IAlgorithmIdentifier, key: key.CryptoKey, signature: Buffer, data: Buffer): boolean;
    encrypt(alg: iwc.IAlgorithmIdentifier, key: key.CryptoKey, data: Buffer): Buffer;
    decrypt(alg: iwc.IAlgorithmIdentifier, key: key.CryptoKey, data: Buffer): Buffer;
    wrapKey(key: key.CryptoKey, wrappingKey: key.CryptoKey, alg: iwc.IAlgorithmIdentifier): Buffer;
    unwrapKey(wrappedKey: Buffer, unwrappingKey: key.CryptoKey, unwrapAlgorithm: iwc.IAlgorithmIdentifier, unwrappedAlgorithm: iwc.IAlgorithmIdentifier, extractable: boolean, keyUsages: string[]): iwc.ICryptoKey;
    deriveKey(algorithm: iwc.IAlgorithmIdentifier, baseKey: key.CryptoKey, derivedKeyType: iwc.IAlgorithmIdentifier, extractable: boolean, keyUsages: string[]): key.CryptoKey;
    exportKey(format: string, key: CryptoKey): Buffer | Object;
    importKey(
        format: string,
        keyData: Buffer,
        algorithm: iwc.IAlgorithmIdentifier,
        extractable: boolean,
        keyUsages: string[]): CryptoKey;
}

export class AlgorithmBase {
    static ALGORITHM_NAME: string = "";

    static generateKey(alg: iwc.IAlgorithmIdentifier, extractable: boolean, keyUsages: string[]): iwc.ICryptoKey | iwc.ICryptoKeyPair {
        throw new Error("Method is not supported");
    }

    static sign(alg: iwc.IAlgorithmIdentifier, key: iwc.ICryptoKey, data: Buffer) {
        throw new Error("Method is not supported");
    }

    static verify(alg: iwc.IAlgorithmIdentifier, key: iwc.ICryptoKey, signature: Buffer, data: Buffer): boolean {
        throw new Error("Method is not supported");
    }

    static encrypt(alg: iwc.IAlgorithmIdentifier, key: key.CryptoKey, data: Buffer): Buffer {
        throw new Error("Method is not supported");
    }

    static decrypt(alg: iwc.IAlgorithmIdentifier, key: key.CryptoKey, data: Buffer): Buffer {
        throw new Error("Method is not supported");
    }

    static wrapKey(key: key.CryptoKey, wrappingKey: key.CryptoKey, alg: iwc.IAlgorithmIdentifier): Buffer {
        throw new Error("Method is not supported");
    }

    static deriveKey(algorithm: iwc.IAlgorithmIdentifier, baseKey: key.CryptoKey, derivedKeyType: iwc.IAlgorithmIdentifier, extractable: boolean, keyUsages: string[]): key.CryptoKey {
        throw new Error("Method is not supported");
    }

    static unwrapKey(wrappedKey: Buffer, unwrappingKey: key.CryptoKey, unwrapAlgorithm: iwc.IAlgorithmIdentifier, unwrappedAlgorithm: iwc.IAlgorithmIdentifier, extractable: boolean, keyUsages: string[]): iwc.ICryptoKey {
        throw new Error("Method is not supported");
    }

    static exportKey(format: string, key: key.CryptoKey): Buffer | Object {
        this.checkKeyType(format);
        let _format = format.toLowerCase();
        let res: Buffer;
        switch (_format) {
            case "spki":
                res = key.key.writeSpki("der");
                break;
            case "pkcs8":
                res = key.key.writePkcs8("der");
                break;
            case "jwk":
                switch (key.type) {
                    case "public":
                    case "private":
                        let kpjwk = key.key.exportJwk(key.type);
                        switch (key.algorithm.name) {
                            case "RSA-OAEP":
                                let hash = /SHA-(\d+)/.exec(key.algorithm.hash.name)[1];
                                kpjwk.alg = "RSA-OAEP" + ((hash !== "1") ? "-" + hash : "");
                                break;
                            case "RSASSA-PKCS1-v1_5":
                                kpjwk.alg = "RS" + /SHA-(\d+)/.exec(key.algorithm.hash.name)[1];
                                break;
                            case "ECDSA":
                            case "ECDH":
                                kpjwk.crv = key.algorithm.namedCurve;
                                break;
                            default:
                                throw new Error(`exportKey::jwk: Unknown algorithm name in use ${key.algorithm.name}`);
                        }
                        kpjwk.key_opt = key.usages;
                        kpjwk.ext = true;
                        return kpjwk;
                        break;
                    case "secret":
                        let secjwk: any = {
                            kty: "oct",
                            exp: true,
                            key_opt: key.usages
                        };
                        switch (key.algorithm.name) {
                            case "AES-CBC":
                            case "AES-GCM":
                                secjwk.alg = "A" + key.algorithm.length + /AES-(.+)/.exec(key.algorithm.name)[1];
                                secjwk.k = base64url(key.key.handle, "binary");
                                break;
                            default:
                                throw new Error(`exportKey::jwk: Unknown algorithm name in use ${key.algorithm.name}`);
                        }
                        return secjwk;
                        break;
                    default:
                        throw new Error(`Unknown key type ${key.type}`);
                }
                break;
            default:
                throw new Error(`Unknown key export format ${_format}`);
        }
        return res;
    }

    static importKey(
        format: string,
        keyData: Buffer,
        algorithm: iwc.IAlgorithmIdentifier,
        extractable: boolean,
        keyUsages: string[]
    ): CryptoKey {
        this.checkKeyType(format);
        let _format = format.toLowerCase();
        let _key;
        switch (_format) {
            case "spki":
                _key = native.KeyPair.readSpki(keyData, "der");
                return new key.CryptoKey(_key, algorithm, "public");
                break;
            case "pkcs8":
                _key = native.KeyPair.readPkcs8(keyData, "der");
                return new key.CryptoKey(_key, algorithm, "private");
                break;
            default:
                throw new Error(`Unsupported format in use '${format}'`);
        }
    }

    static checkKeyType(type: string) {
        const ERROR_TYPE = "KeyType";
        let _type = type.toLowerCase();
        switch (type) {
            case "spki":
            case "pkcs8":
            case "jwk":
                break;
            case "raw":
                throw new TypeError(`${ERROR_TYPE}: '${_type}' is not supported yet`);
            default:
                throw new TypeError(`${ERROR_TYPE}: Unknown key type in use '${_type}'`);
        }
    }

    static checkExportKey(format: string, key: CryptoKey) {
        const ERROR_TYPE = "ExportKey";

        let _format = format.toLowerCase();
        this.checkKeyType(format);

        if (key.type === "private") {
            if (_format !== "pkcs8")
                throw new TypeError(`${ERROR_TYPE}: Only 'pkcs8' is allowed`);
        }
        else if (key.type === "public") {
            if (_format !== "spki")
                throw new TypeError(`${ERROR_TYPE}: Only 'spki' is allowed`);
        }
        else {
            throw new TypeError(`${ERROR_TYPE}: Only for 'private' and 'public' key allowed`);
        }
    }

    static checkAlgorithmIdentifier(alg) {
        if (typeof alg !== "object")
            throw TypeError("AlgorithmIdentifier: Algorithm must be an Object");
        if (!(alg.name && typeof (alg.name) === "string"))
            throw TypeError("AlgorithmIdentifier: Missing required property name");
        if (alg.name.toLowerCase() !== this.ALGORITHM_NAME.toLowerCase())
            throw new Error("AlgorithmIdentifier: Wrong algorithm name. Must be " + this.ALGORITHM_NAME);
        alg.name = this.ALGORITHM_NAME;
    }

    static checkAlgorithmHashedParams(alg) {
        if (!alg.hash)
            throw new TypeError("AlgorithmHashedParams: Missing required property hash");
        if (typeof alg.hash !== "object")
            throw TypeError("AlgorithmIdentifier: Algorithm must be an Object");
        if (!(alg.hash.name && typeof (alg.hash.name) === "string"))
            throw TypeError("AlgorithmIdentifier: Missing required property name");
    }

    static checkKey(key: iwc.ICryptoKey, type: string) {
        if (!key)
            throw new TypeError("CryptoKey: Key can not be null");
        if (key.type !== type)
            throw new TypeError(`CryptoKey: Wrong key type in use. Must be '${type}'`);
    }

    static checkPrivateKey(key: iwc.ICryptoKey) {
        this.checkKey(key, "private");
    }

    static checkPublicKey(key: iwc.ICryptoKey) {
        this.checkKey(key, "public");
    }

    static checkSecretKey(key: iwc.ICryptoKey) {
        this.checkKey(key, "secret");
    }
} 