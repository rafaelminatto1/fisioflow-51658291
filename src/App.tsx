import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { AppProviders, useAppRuntime } from "@/app/AppRuntime";

const App = () => {
  useAppRuntime("App");

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
};

export default App;
