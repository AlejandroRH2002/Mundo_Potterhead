import {PrismaClient} from '@prisma/client';
import {loadLocalDevelopment} from '../server/localDevelopment.ts';
import {readConfig,ConfigurationError} from '../server/config.ts';
import {startupDiagnostic} from '../server/lib/startupDiagnostic.ts';
let db;
try{
 const aligned=await loadLocalDevelopment();
 const config=readConfig(process.env),url=new URL(config.databaseUrl);
 if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new ConfigurationError('Diagnóstico permitido únicamente para base local.');
 console.log(JSON.stringify({node:process.versions.node,localDatabase:true,databasePort:Number(url.port||5432),alignedToCompose:aligned,apiPort:config.port,inventoryMode:process.env.INVENTORY_MODE??'capture'}));
 db=new PrismaClient({datasources:{db:{url:config.databaseUrl}}});await db.$queryRaw`SELECT 1`;console.log('DATABASE_CONNECTIVITY_OK');
 await db.productSku.findFirst({select:{id:true,quantity:true,version:true}});console.log('INVENTORY_SCHEMA_OK');
}catch(error){console.error(JSON.stringify(error instanceof ConfigurationError?{code:'LOCAL_CONFIGURATION_INVALID',reason:error.message}:startupDiagnostic(error)));process.exitCode=1;}
finally{await db?.$disconnect();}
