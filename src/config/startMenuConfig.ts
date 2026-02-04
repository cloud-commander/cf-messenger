import { APP_CONFIG } from "./appConfig";

export interface StartMenuItem {
  type: "link" | "separator";
  icon?: string;
  label?: string;
  subLabel?: string;
  bold?: boolean;
  action?: () => void;
}

export const startMenuLeft: StartMenuItem[] = [
  {
    type: "link",
    icon: "/icons/start/iexplorer.png",
    label: "Internet",
    subLabel: "Internet Explorer",
    bold: true,
  },
  {
    type: "link",
    icon: "/icons/start/emailoutlook.png",
    label: "E-mail",
    subLabel: "Outlook Express",
    bold: true,
  },
  { type: "separator" },
  {
    type: "link",
    icon: "/cf-messenger-logo.png",
    label: APP_CONFIG.APP_NAME,
  },
  { type: "link", icon: "/icons/start/exe.png", label: "Windows Media Player" },
  { type: "link", icon: "/icons/start/tourwsxp.png", label: "Windows XP Tour" },
  {
    type: "link",
    icon: "/icons/start/folder.png",
    label: "Files and Settings Transfer Wizard",
  },
];

export const startMenuRight: StartMenuItem[] = [
  {
    type: "link",
    icon: "/icons/start/mydocs.png",
    label: "My Documents",
    bold: true,
  },
  {
    type: "link",
    icon: "/icons/start/folder.png",
    label: "My Recent Documents",
    bold: true,
  },
  {
    type: "link",
    icon: "/icons/start/mypics.png",
    label: "My Pictures",
    bold: true,
  },
  {
    type: "link",
    icon: "/icons/start/mymusic.png",
    label: "My Music",
    bold: true,
  },
  {
    type: "link",
    icon: "/icons/start/computer.png",
    label: "My Computer",
    bold: true,
  },
  { type: "separator" },
  { type: "link", icon: "/icons/start/controll.png", label: "Control Panel" },
  {
    type: "link",
    icon: "/icons/start/folder.png",
    label: "Set Program Access and Defaults",
  },
  {
    type: "link",
    icon: "/icons/start/printer.png",
    label: "Printers and Faxes",
  },
  { type: "separator" },
  { type: "link", icon: "/icons/start/help.png", label: "Help and Support" },
  { type: "link", icon: "/icons/start/search.png", label: "Search" },
  { type: "link", icon: "/icons/start/run.png", label: "Run..." },
];
export const startMenuConfig = {
  startButton: {
    text: "start",
    title: "Click here to begin",
  },
  header: {
    defaultName: "User",
  },
  leftColumn: startMenuLeft,
  rightColumn: startMenuRight,
  allPrograms: {
    label: "All Programs",
  },
  footer: {
    logOff: {
      label: "Log Off",
      icon: "/icons/start/logoff.png",
    },
    turnOff: {
      label: "Turn Off Computer",
      icon: "/icons/start/turnoff.png",
    },
  },
};
