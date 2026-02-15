export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Task Management",
  description: "Secure Task Management System — Manage your tasks with confidence.",
  navItems: [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Meeting Notes",
      href: "/dashboard/meetings",
    },
  ],
  navMenuItems: [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Meeting Notes",
      href: "/dashboard/meetings",
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
};
