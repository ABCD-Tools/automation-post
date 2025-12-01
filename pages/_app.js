import "../styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import Smoother from "@components/Smoother";

export default function App({ Component, pageProps }) {
  return (
    <Smoother>
      <Component {...pageProps} />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </Smoother>
  );
}
