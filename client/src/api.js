const BASE=import.meta.env.PROD
  ? (import.meta.env.VITE_MYSTERY_API_BASE_URL||'https://mysteryx-website-1.onrender.com/api/v1')
  : (import.meta.env.VITE_API_BASE_URL||'http://localhost:5000/api/v1');
export async function api(path,options={}){const response=await fetch(`${BASE}${path}`,{credentials:'include',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error?.message||'Something went wrong. Please try again.');return body.data;}
