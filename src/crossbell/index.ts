import {
    AttributesMetadata,
    CharacterMetadata,
    CharacterOperatorPermission,
    Contract,
    Numberish,
    createIndexer,
    getProviderAccount,
} from "crossbell";
import { Account, Accountish } from "../types/account";
import { Record } from "../types/record";
import { encode, hashOf } from "../utils";
import { settings } from "../config";
import { privateKeyToAddress } from "viem/accounts";
import { type EIP1193Provider } from "eip1193-types";

type CharacterPermissionKey = keyof typeof CharacterOperatorPermission;

export type Attrs = Exclude<AttributesMetadata["attributes"], null | undefined>;

const formatHandle = (acc: Account) => {
    const guildCode = encode(acc.guildId ?? acc.handle);
    const userCode = encode(acc.handle);
    let tmpHandle = userCode + "-" + guildCode;

    const suffix = hashOf(tmpHandle);

    tmpHandle = tmpHandle.slice(0, 31 - 5) + "-" + suffix;

    let handle = "";
    for (let i = 0; i < Math.min(31, tmpHandle.length); i++) {
        const c = tmpHandle[i];
        if (
            (c >= "a" && c <= "z") ||
            (c >= "0" && c <= "9") ||
            c == "_" ||
            c == "-"
        ) {
            handle += c;
            continue;
        } else {
            handle += "-";
        }
    }
    return handle;
};

const createNewCharacter = async (
    c: Contract,
    admin: `0x${string}`,
    handle: string,
    acc: Account
) => {
    const profile = {
        connected_accounts: [
            "csb://account:" + acc.handle + "@" + acc.platform.toLowerCase(),
        ],
    } as CharacterMetadata;
    const { nickname, avatar, banner } = acc;
    if (nickname) profile.name = nickname;
    if (avatar) profile.avatars = [avatar];
    if (acc.dao) (profile as any).variant = "dao";
    if (banner)
        profile.banners = [
            {
                address: banner,
                mime_type: "media/image", //TODO
            },
        ];
    const { data } = await c.character.create({
        owner: admin,
        handle,
        metadataOrUri: profile,
    });
    return data;
};

export const createNewRecordIfNotExist = async (
    c: Contract,
    admin: `0x${string}`,
    handle: string,
    rec: Record,
    curator: Numberish
) => {
    const { data } = await c.character.getByHandle({ handle });
    if (data.characterId) {
        return data.characterId;
    } else {
        return createNewRecord(c, admin, handle, rec, curator);
    }
};

export const createNewRecord = async (
    c: Contract,
    admin: `0x${string}`,
    handle: string,
    rec: Record,
    curator: Numberish
) => {
    const profile = {
        ...rec,
        original_curator_id: curator.toString(),
        variant: "record",
    } as CharacterMetadata;

    const { data } = await c.character.create({
        owner: admin,
        handle,
        metadataOrUri: profile,
    });
    return data;
};

export const getPermission = async (
    c: Contract,
    characterId: number,
    admin: `0x${string}`
) => {
    const permissions = await c.operator.getPermissionsForCharacter({
        characterId,
        operator: admin,
    });
    return permissions;
};

// if the character bound to account is not existed, create it;
// if it has been existed, return the character id
export const getCharacterByAcc = async (options: {
    c: Contract;
    acc: Account;
    admin?: `0x${string}`;
    createIfNotExist?: true; // if this is true, admin has to be provided
}) => {
    const prefix = settings.botConfig.prod ? "" : "test-";
    const handle = (prefix + formatHandle(options.acc)).slice(0, 31);

    let existed = true;
    const { c, acc, admin, createIfNotExist } = options;
    const { data } = await c.character.getByHandle({ handle });
    let characterId = data.characterId;
    if (!characterId) {
        existed = false;
        if (createIfNotExist && admin)
            characterId = await createNewCharacter(c, admin, handle, acc);
    }

    return { characterId, existed };
};

// if the character bound to account is not existed, create it;
// if it has been existed, check if the admin has required permissions
// return that character id
export const getCharacter = async (
    c: Contract,
    admin: `0x${string}`,
    acc: Accountish,
    requiredPermissions: CharacterPermissionKey[]
) => {
    const { characterId, existed } =
        typeof acc === "object"
            ? await getCharacterByAcc({
                  c,
                  admin,
                  acc,
                  createIfNotExist: true,
              })
            : { characterId: acc, existed: true };

    if (existed) {
        let characterOwner = admin;
        try {
            characterOwner = await c.contract.read.ownerOf([
                BigInt(characterId),
            ]);
        } catch (e) {
            // non existed character
        }
        if (characterOwner !== admin) {
            const permissions = (
                await getPermission(c, Number(characterId), admin)
            ).data;
            for (const p of requiredPermissions) {
                if (!permissions.includes(p)) {
                    throw new Error(
                        characterId +
                            "(account:" +
                            JSON.stringify(acc) +
                            ") not authorized"
                    );
                }
            }
        }
    }

    return characterId;
};

export const setup = async (
    priKeyOrProvider?: `0x${string}` | EIP1193Provider
) => {
    // if prikey is not provided, use the `0x0`
    if (!priKeyOrProvider) {
        const contract = new Contract(undefined);
        return { admin: "0x0" as `0x${string}`, contract };
    }
    // const admin = privateKeyToAddress(priKeyOrProvider);
    const admin =
        typeof priKeyOrProvider === "string"
            ? privateKeyToAddress(priKeyOrProvider)
            : getProviderAccount(priKeyOrProvider)?.address;
    const contract = new Contract(priKeyOrProvider);
    if (admin === undefined) throw new Error("account is undefined");
    return { admin, contract };
};

// Get id of an account
export async function getIdBy(acc: Accountish) {
    let id: Numberish;
    if (typeof acc === "object") {
        const { contract } = await setup();
        const { existed, characterId } = await getCharacterByAcc({
            acc,
            c: contract,
        });
        id = characterId;
        if (!existed) return 0;
    } else {
        id = acc;
    }
    return id;
}

// Get all links of an acc
export async function getLinks(acc: Accountish) {
    const id = await getIdBy(acc);
    if (id === 0) return { count: 0, list: [] };
    const indexer = createIndexer();
    return await indexer.linklist.getMany(id, { limit: 1000 });
    // TODO: add pagination
}
