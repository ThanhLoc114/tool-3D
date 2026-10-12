import { analyzeImage } from './image-processing.js';
self.onmessage=({data})=>{
  try{const result=analyzeImage(data);self.postMessage({id:data.id,result},[result.preview.buffer])}
  catch(error){self.postMessage({id:data.id,error:error.message})}
};
