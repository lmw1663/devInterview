import prisma from "../lib/prisma";
import {hashPassword, comparePassword} from "../utils/hash";

export const createUser = async (
    email: string,
    password: string
) => {
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword
        }
    });
    return user;
}

export const findUserByEmail = async (email: string) => {

    return prisma.user.findUnique({
        where: {email}
    });
};

export  const validatePassword = async (
    password: string,
    hashed: string
) => {
    return comparePassword(password,hashed);
};
