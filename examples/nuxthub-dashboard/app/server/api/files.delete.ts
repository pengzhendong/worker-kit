import { blob } from 'hub:blob';
import { smallInput } from '../utils/input';
export default defineEventHandler(async event => {const input=await smallInput(event);if(typeof input.pathname!=='string'||!/^demo\/[a-f0-9-]{36}\.txt$/.test(input.pathname))throw createError({statusCode:400,message:'文件标识无效'});await blob.del(input.pathname);return {deleted:true};});
