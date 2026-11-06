import { kv } from 'hub:kv';
import { smallInput } from '../utils/input';
export default defineEventHandler(async event => {const input=await smallInput(event);if(typeof input.label!=='string'||input.label.length>80)throw createError({statusCode:422,message:'内容最多 80 个字符'});await kv.set('workbench:label',input.label);return {saved:true};});
