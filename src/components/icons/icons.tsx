import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faDownload,
  faTrashAlt,
  faFileUpload,
  faPaperPlane,
  faAngleRight,
  faAngleLeft,
  faRobot,
  faAngleDown,
  faSearch,
  faDoorOpen,
  faFolderOpen,
  faLineChart,
  faFileAlt,
  faHome,
  faFileDownload,
  faEye,
  faClose,
} from "@fortawesome/free-solid-svg-icons";

import BotChatIcon from "@/assets/icons/botchat.png";
import ClockIcon from "@/assets/icons/clock.svg?react";
import CopyIcon from "@/assets/icons/copy.svg?react";
import DownloadIcon from "@/assets/icons/download.svg?react";
import MoreHorizontalIcon from "@/assets/icons/more-horizontal.svg?react";
import SearchIcon from "@/assets/icons/search.svg?react";
import SendIcon from "@/assets/icons/send.svg?react";
import Share2Icon from "@/assets/icons/share-2.svg?react";
import SideBarIcon from "@/assets/icons/sidebar.svg?react";
import Trash2Icon from "@/assets/icons/trash-2.svg?react";
import UploadIcon from "@/assets/icons/upload.svg?react";
import XIcon from "@/assets/icons/x.svg?react";

import ChatBotIcon from "@/assets/icons/chatbot.svg?react";
import ChatIcon from "@/assets/icons/chat.svg?react";
import SendIcon2 from "@/assets/icons/send-icon-2.svg?react";

const Icons = {
  ArrowsRotate: (props: any) => (
    <FontAwesomeIcon icon={faArrowsRotate} {...props} />
  ),
  Download: (props: any) => <FontAwesomeIcon icon={faDownload} {...props} />,
  TrashAlt: (props: any) => <FontAwesomeIcon icon={faTrashAlt} {...props} />,
  FileUpload: (props: any) => (
    <FontAwesomeIcon icon={faFileUpload} {...props} />
  ),
  PaperPlane: (props: any) => (
    <FontAwesomeIcon icon={faPaperPlane} {...props} />
  ),
  AngleRight: (props: any) => (
    <FontAwesomeIcon icon={faAngleRight} {...props} />
  ),
  AngleLeft: (props: any) => <FontAwesomeIcon icon={faAngleLeft} {...props} />,
  Robot: (props: any) => <FontAwesomeIcon icon={faRobot} {...props} />,
  AngleDown: (props: any) => <FontAwesomeIcon icon={faAngleDown} {...props} />,
  Search: (props: any) => <FontAwesomeIcon icon={faSearch} {...props} />,
  DoorOpen: (props: any) => <FontAwesomeIcon icon={faDoorOpen} {...props} />,
  FolderOpen: (props: any) => (
    <FontAwesomeIcon icon={faFolderOpen} {...props} />
  ),
  LineChart: (props: any) => <FontAwesomeIcon icon={faLineChart} {...props} />,
  FileAlt: (props: any) => <FontAwesomeIcon icon={faFileAlt} {...props} />,
  Home: (props: any) => <FontAwesomeIcon icon={faHome} {...props} />,
  FileDownload: (props: any) => (
    <FontAwesomeIcon icon={faFileDownload} {...props} />
  ),
  Eye: (props: any) => <FontAwesomeIcon icon={faEye} {...props} />,
  Close: (props: any) => <FontAwesomeIcon icon={faClose} {...props} />,

  BotChat: (props: any) => <img src={BotChatIcon} alt="Bot Chat" className="w-12 h-12" {...props} />,
  Clock: (props: any) => <ClockIcon {...props} />,
  Copy: (props: any) => <CopyIcon {...props} />,
  DownloadIcon: (props: any) => <DownloadIcon {...props} />,
  MoreHorizontal: (props: any) => <MoreHorizontalIcon {...props} />,
  SearchIcon: (props: any) => <SearchIcon {...props} />,
  SendIcon: (props: any) => <SendIcon {...props} />,
  Share2Icon: (props: any) => <Share2Icon {...props} />,
  SideBarIcon: (props: any) => <SideBarIcon {...props} />,
  Trash2Icon: (props: any) => <Trash2Icon {...props} />,
  UploadIcon: (props: any) => <UploadIcon {...props} />,
  XIcon: (props: any) => <XIcon {...props} />,

  ChatBot: (props: any) => <ChatBotIcon {...props} />,
  ChatIcon: (props: any) => <ChatIcon {...props} />,
  Send: (props: any) => <SendIcon2 {...props} />,
};

export { Icons };
export default Icons;
