"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export function useAdminRpc<T>(name: string, args: Record<string, string | number> = {}) {
  const serialized = JSON.stringify(args);
  const [result, setResult] = useState<{data:T|null; error:string; loading:boolean}>({data:null,error:"",loading:true});
  useEffect(() => {
    let alive = true;
    supabase.rpc(name, JSON.parse(serialized)).then(({data,error}) => { if(alive) setResult({data:error ? null : data as T,error:error?.message || "",loading:false}); });
    return () => { alive=false; };
  }, [name,serialized]);
  return result;
}
export function date(value:string) { return new Date(value).toLocaleString("de-DE"); }
