import { Prisma } from '@prisma/client';
export function databaseDiagnostic(error:unknown,stage:string){
 if(process.env.NODE_ENV!=='development')return;
 const errorClass=error instanceof Prisma.PrismaClientKnownRequestError?'PrismaClientKnownRequestError':error instanceof Prisma.PrismaClientInitializationError?'PrismaClientInitializationError':error instanceof Prisma.PrismaClientUnknownRequestError?'PrismaClientUnknownRequestError':error instanceof Prisma.PrismaClientValidationError?'PrismaClientValidationError':error instanceof Error?'Error':'Unknown';
 const rawCode=error instanceof Prisma.PrismaClientKnownRequestError?error.code:error instanceof Prisma.PrismaClientInitializationError?error.errorCode:undefined;
 console.warn(JSON.stringify({event:'database.diagnostic',stage,errorClass,code:rawCode&&/^P\d{4}$/.test(rawCode)?rawCode:'UNKNOWN'}));
}
