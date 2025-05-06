// Autor: Oliver Nemček

import { useEffect, useState } from "react";
import { load } from "@loaders.gl/core";

function useLoader(file, loader) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setData(null);
    setErr(false);
    setIsLoading(true);

    load(file, loader).catch((error) => {
      setErr(true);
    }).then((result) => {
      setData(result);
      if(result){
        setErr(false);
      }
      setIsLoading(false);
    });
  }, [file, loader]);

  return { data, err, isLoading };
}

export default useLoader;