import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { useWindowStore } from "../../../store/useWindowStore";

interface InternetExplorerProps {
  windowId: string;
  onClose: () => void;
}

export function InternetExplorer({ windowId, onClose }: InternetExplorerProps) {
  const [iframeSrc, setIframeSrc] = useState<string>("/ie/home.html");
  const [inputValue, setInputValue] = useState<string>("/ie/home.html");
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { minimizeWindow, isWindowMaximized, toggleMaximize } =
    useWindowStore();
  const isMaximized = isWindowMaximized(windowId);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputRef.current) {
      let val = inputRef.current.value;
      if (!val.startsWith("http") && !val.startsWith("/")) {
        val = "https://" + val;
      }
      setIframeSrc(val);
      setInputValue(val);
    }
  };

  const goHome = () => {
    setIframeSrc("/ie/home.html");
    setInputValue("/ie/home.html");
  };

  const goBack = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.history.back();
    }
  };

  const goForward = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.history.forward();
    }
  };

  const handleIframeLoad = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        const currentPath = iframeRef.current.contentWindow.location.pathname;
        if (currentPath && currentPath !== "blank") {
          setInputValue(currentPath);
        }
      }
    } catch {
      // Cross-origin displacement - can't read path
    }
  };

  return (
    <div className="window w-full h-full flex flex-col shadow-xp-window font-sans">
      {/* Title Bar - Handled by DraggableWindow via .title-bar class */}
      <div className="title-bar flex-none select-none">
        <div className="title-bar-text flex items-center gap-1">
          <img src="/icons/ie/iexplorer.png" className="w-4 h-4" alt="IE" />
          Internet Explorer
        </div>
        <div className="title-bar-controls">
          <button
            className="no-drag"
            aria-label="Minimize"
            onClick={() => {
              minimizeWindow(windowId);
            }}
          />
          <button
            className="no-drag"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={() => {
              toggleMaximize(windowId);
            }}
          />
          <button
            className="no-drag"
            aria-label="Close"
            onClick={() => {
              onClose();
            }}
          />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col p-0 overflow-hidden bg-xp-window-bg">
        {/* Menu Bar */}
        <div className="flex items-center border-b border-xp-border-silver bg-xp-menu-bg">
          <div className="flex flex-1 gap-3 p-1 px-2">
            <span className="text-msn-sm hover:bg-[#316AC5] hover:text-white px-1 cursor-default">
              File
            </span>
            <span className="text-msn-sm hover:bg-[#316AC5] hover:text-white px-1 cursor-default">
              Edit
            </span>
            <span className="text-msn-sm hover:bg-[#316AC5] hover:text-white px-1 cursor-default">
              View
            </span>
            <span className="text-msn-sm hover:bg-[#316AC5] hover:text-white px-1 cursor-default">
              Favorites
            </span>
            <span className="text-msn-sm hover:bg-[#316AC5] hover:text-white px-1 cursor-default">
              Tools
            </span>
            <span className="text-msn-sm hover:bg-[#316AC5] hover:text-white px-1 cursor-default">
              Help
            </span>
          </div>
          <div className="flex justify-center w-10 border-l border-gray-300 bg-white py-1">
            <img src="/icons/ie/xp-logo.png" className="w-5 h-5" alt="XP" />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center bg-xp-menu-bg p-1 border-b border-xp-border-silver gap-0.5 select-none h-[38px]">
          {/* Back - Special Layout */}
          <div
            className="flex items-center group h-[30px] border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] pr-1 cursor-default active:bg-gray-200"
            onClick={goBack}
          >
            <div className="flex items-center gap-1 px-1">
              <img
                src="/icons/ie/go-back.png"
                className="w-[26px] h-[26px]"
                alt="Back"
              />
              <span className="text-xs -mt-0.5">Back</span>
            </div>
            <div className="h-[20px] w-px bg-gray-300 mx-0.5" />
            <span className="text-msn-micro px-0.5 mt-0.5">▼</span>
          </div>

          {/* Forward - Standard Layout with Dropdown */}
          <div
            className="flex items-center group h-[30px] border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] px-1 cursor-default active:bg-gray-200 ml-0.5"
            onClick={goForward}
          >
            <img
              src="/icons/ie/go-foward.png"
              className="w-[26px] h-[26px]"
              alt="Forward"
            />
            <span className="text-msn-micro ml-1 mt-0.5">▼</span>
          </div>

          <div className="w-px h-[26px] bg-gray-300 mx-1" />

          {/* Stop */}
          <div className="w-[30px] h-[30px] flex items-center justify-center border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200">
            <img
              src="/icons/ie/close.png"
              className="w-[22px] h-[22px]"
              alt="Stop"
            />
          </div>
          {/* Refresh */}
          <div
            className="w-[30px] h-[30px] flex items-center justify-center border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200"
            onClick={() => {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.location.reload();
              }
            }}
          >
            <img
              src="/icons/ie/refresh.png"
              className="w-[22px] h-[22px]"
              alt="Refresh"
            />
          </div>
          {/* Home */}
          <div
            className="w-[30px] h-[30px] flex items-center justify-center border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200"
            onClick={goHome}
          >
            <img
              src="/icons/ie/home.png"
              className="w-[22px] h-[22px]"
              alt="Home"
            />
          </div>

          <div className="w-px h-[26px] bg-gray-300 mx-1" />

          {/* Search, Favorites, History */}
          <div className="flex items-center h-[30px] px-1 border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200 gap-1">
            <img
              src="/icons/ie/search.png"
              className="w-[22px] h-[22px]"
              alt="Search"
            />
            <span className="text-msn-sm">Search</span>
          </div>
          <div className="flex items-center h-[30px] px-1 border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200 gap-1">
            <img
              src="/icons/ie/yellow-star.png"
              className="w-[22px] h-[22px]"
              alt="Favorites"
            />
            <span className="text-msn-sm">Favorites</span>
          </div>
          <div className="w-[30px] h-[30px] flex items-center justify-center border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200">
            <img
              src="/icons/ie/clock-refresh.png"
              className="w-[22px] h-[22px]"
              alt="History"
            />
          </div>

          <div className="w-px h-[26px] bg-gray-300 mx-1" />

          {/* Mail/Print */}
          <div className="w-[30px] h-[30px] flex items-center justify-center border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200">
            <img
              src="/icons/ie/envelope.png"
              className="w-[22px] h-[22px]"
              alt="Mail"
            />
          </div>
          <div className="w-[30px] h-[30px] flex items-center justify-center border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200">
            <img
              src="/icons/ie/printer.png"
              className="w-[22px] h-[22px]"
              alt="Print"
            />
          </div>
          <div className="w-[30px] h-[30px] flex items-center justify-center border border-transparent hover:border-gray-400 hover:shadow-inner rounded-[3px] cursor-default active:bg-gray-200">
            <img
              src="/icons/ie/msnlogo.png"
              className="w-[22px] h-[22px]"
              alt="Messenger"
            />
          </div>
        </div>

        {/* Address Bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-1 px-2 py-1 bg-xp-menu-bg border-b border-xp-border-silver shadow-[inset_0_1px_0_white]"
        >
          <span className="text-msn-sm text-gray-500">Address</span>
          <div className="flex-1 flex bg-white border border-[#7F9DB9] relative">
            <img
              src="/icons/ie/iexplorer.png"
              className="w-4 h-4 my-auto ml-1"
              alt="page"
            />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              className="flex-1 w-full p-1 text-msn-sm outline-none border-none ml-1"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 px-2 py-0.5 bg-xp-menu-bg border border-xp-border-silver hover:bg-white active:bg-gray-200"
          >
            <img
              src="/icons/ie/green-arrow-right.png"
              className="w-4 h-4"
              alt="Go"
            />
            <span className="text-xs">Go</span>
          </button>

          <div className="inline-flex items-center gap-1 ml-2">
            <span className="text-xs text-gray-500">Links</span>
            <img
              src="/icons/ie/double-arrouw-right-black.png"
              className="w-2 h-2"
              alt=">>"
            />
          </div>
        </form>

        {/* Content */}
        <div className="flex-1 bg-white relative">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            onLoad={handleIframeLoad}
            className="w-full h-full border-none"
            title="Content"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>

        {/* Status Bar */}
        <div className="h-msn-h-taskbar bg-xp-menu-bg border-t border-xp-border-silver flex items-center justify-between px-2 text-msn-sm text-gray-600 shadow-[inset_0_1px_0_white]">
          <div className="flex items-center gap-1">
            <img
              src="/icons/ie/iexplorer.png"
              className="w-3 h-3 grayscale opacity-70"
              alt=""
            />
            <span>Done</span>
          </div>

          <div className="flex items-center gap-1 px-2 border-l border-gray-300 h-4 border-r border-r-gray-200 border-l-gray-400 bg-[#f0eede] shadow-sm ml-auto mr-1">
            <img
              src="/icons/ie/iexplorer.png"
              className="w-4 h-4"
              alt="Internet"
            />
            <span className="text-msn-micro">Internet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
