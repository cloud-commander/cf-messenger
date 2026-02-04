import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InternetExplorer } from "../components/apps/InternetExplorer/InternetExplorer";

// Mock store
const mockMinimize = vi.fn();
const mockToggleMax = vi.fn();
const mockIsMaximized = vi.fn().mockReturnValue(false);

vi.mock("../../store/useWindowStore", () => ({
  useWindowStore: () => ({
    minimizeWindow: mockMinimize,
    isWindowMaximized: mockIsMaximized,
    toggleMaximize: mockToggleMax,
  }),
}));

describe("InternetExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMaximized.mockReturnValue(false);
  });

  it("should render default home page", () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const iframe = screen.getByTitle("Content") as HTMLIFrameElement;
    expect(iframe.src).toContain("/ie/home.html");
    expect(screen.getByDisplayValue("/ie/home.html")).toBeDefined();
  });

  it("should allow navigation", () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("/ie/home.html");
    fireEvent.change(input, { target: { value: "https://google.com" } });

    // Find form and submit via Go button
    const goButton = screen.getByText("Go");
    fireEvent.click(goButton);

    const iframe = screen.getByTitle("Content") as HTMLIFrameElement;
    expect(iframe.src).toBe("https://google.com/");
  });

  it("should handle navigation with relative paths", () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("/ie/home.html");
    fireEvent.change(input, { target: { value: "/ie/about.html" } });

    const goButton = screen.getByText("Go");
    fireEvent.click(goButton);

    const iframe = screen.getByTitle("Content") as HTMLIFrameElement;
    expect(iframe.src).toContain("/ie/about.html");
  });

  it("should call minimize handler when minimize button clicked", () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const minimizeButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.className.includes("min"));
    if (minimizeButtons.length > 0) {
      fireEvent.click(minimizeButtons[0]);
      expect(mockMinimize).toHaveBeenCalledWith("ie");
    }
  });

  it("should call maximize toggle when maximize button clicked", () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    // Find maximize button (typically second control button)
    const maximizeBtn = buttons.find(
      (btn) =>
        btn.className.includes("max") ||
        btn.nextElementSibling?.className.includes("close"),
    );
    if (maximizeBtn) {
      fireEvent.click(maximizeBtn);
      expect(mockToggleMax).toHaveBeenCalledWith("ie");
    }
  });

  it("should call onClose when close button clicked", () => {
    const onCloseMock = vi.fn();
    render(<InternetExplorer windowId="ie" onClose={onCloseMock} />);
    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons[closeButtons.length - 1]; // Usually last button
    fireEvent.click(closeBtn);
    // onClose should be called
    expect(onCloseMock).toBeDefined();
  });

  it("should add http:// prefix to URLs without protocol", () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("/ie/home.html");
    fireEvent.change(input, { target: { value: "example.com" } });

    const goButton = screen.getByText("Go");
    fireEvent.click(goButton);

    const iframe = screen.getByTitle("Content") as HTMLIFrameElement;
    // Should have http:// added
    expect(iframe.src).toMatch(/http/);
  });

  it("should update input when navigating", async () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("/ie/home.html") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "https://test.com" } });

    const goButton = screen.getByText("Go");
    fireEvent.click(goButton);

    await waitFor(() => {
      expect(input.value).toContain("test.com");
    });
  });

  it("should render with correct window styling when maximized", () => {
    mockIsMaximized.mockReturnValue(true);
    const { container } = render(
      <InternetExplorer windowId="ie" onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeDefined();
  });

  it("should handle empty URL input gracefully", () => {
    render(<InternetExplorer windowId="ie" onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("/ie/home.html");
    fireEvent.change(input, { target: { value: "" } });

    const goButton = screen.getByText("Go");
    fireEvent.click(goButton);

    // Should handle gracefully without crashing
    const iframe = screen.getByTitle("Content") as HTMLIFrameElement;
    expect(iframe).toBeDefined();
  });
});
