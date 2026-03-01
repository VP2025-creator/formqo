import Logo from "@/components/Logo";

const Footer = () => (
  <footer className="border-t border-border bg-background py-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
        <div className="col-span-2">
          <div className="mb-4">
            <Logo height={24} />
          </div>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
            Beautiful forms that convert. Built for teams who care about data quality.
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold text-sm mb-4">Product</h4>
          <ul className="space-y-3">
            {[
              { label: "Features", href: "/#features" },
              { label: "Pricing", href: "/pricing" },
              { label: "Templates", href: "/templates" },
              { label: "Integrations", href: "/dashboard/integrations" },
            ].map((item) => (
              <li key={item.label}>
                <a href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold text-sm mb-4">Company</h4>
          <ul className="space-y-3">
            {["About", "Blog", "Careers", "Contact"].map((item) => (
              <li key={item}>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold text-sm mb-4">Legal</h4>
          <ul className="space-y-3">
            {["Privacy", "Terms", "Cookies", "Security"].map((item) => (
              <li key={item}>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">© 2026 Formqo. All rights reserved.</p>
        <p className="text-xs text-muted-foreground">Crafted with ♡ by TDV Labs</p>
      </div>
    </div>
  </footer>
);

export default Footer;
