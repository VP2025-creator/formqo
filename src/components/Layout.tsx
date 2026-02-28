import { Outlet } from "react-router-dom";
import Footer from "@/components/Footer";

/** Wraps pages that should display the shared Footer. */
const Layout = () => (
  <>
    <Outlet />
    <Footer />
  </>
);

export default Layout;
