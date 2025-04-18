import "./App.css";
import {useRoutes } from "react-router";
import { routes } from "./routers/index";
// import { useEffect } from "react";

function App() {
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const response = await fetch("http://localhost:8000/data");
  //       const jsonData = await response.json();
  //       console.log(jsonData.message)
  //     } catch (error) {
  //       console.error("Error fetching data:", error);
  //     }
  //   };

  //   fetchData();
  // }, []);
  const element = useRoutes(routes);
  return (
    <>
      {element}
    </>
  );
}

export default App;
