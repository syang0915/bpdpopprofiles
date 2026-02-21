import { useEffect, useState } from "react";


export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("http://127.0.0.1:5000/api/dbquery");
      const data = await res.json();
      setData(data);
    };
    fetchData();
  }, []);

  return (
    <h1 className="text-2xl font-bold underline">
      Hello world!
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </h1>

  )
}