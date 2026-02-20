import { Link } from "react-router-dom";
import formqoLogo from "@/assets/formqo-logo.png";

interface LogoProps {
  /** Height of the logo image in px (default 28) */
  height?: number;
  /** Extra tailwind classes on the wrapper div */
  className?: string;
  /** Invert to white — use on dark/primary-coloured backgrounds */
  invert?: boolean;
}

const Logo = ({ height = 28, className = "", invert = false }: LogoProps) => (
  <div className={className}>
    <Link to="/" className="inline-flex items-center">
      <img
        src={formqoLogo}
        alt="Formqo"
        style={{ height, width: "auto" }}
        className={invert ? "brightness-0 invert" : "brightness-0"}
      />
    </Link>
  </div>
);

export default Logo;
