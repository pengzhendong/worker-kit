import { blob } from 'hub:blob';
import { smallInput } from '../utils/input';
export default defineEventHandler(async event => {const input=await smallInput(event);if(typeof input.text!=='string'||!input.text||input.text.length>4096)throw createError({statusCode:422,message:'文本需为 1–4096 个字符'});return blob.put('demo/'+crypto.randomUUID()+'.txt',input.text,{contentType:'text/plain'});});
