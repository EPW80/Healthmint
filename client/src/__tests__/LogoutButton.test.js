import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import LogoutButton from "../components/LogoutButton";
import { performLogout } from "../utils/authLoopPrevention";

jest.mock("../utils/authLoopPrevention", () => ({
  performLogout: jest.fn(), // Mock the performLogout function
}));

const mockStore = createStore(() => ({}));

describe("LogoutButton", () => {
  test("should call performLogout when clicked", () => {
    render(
      <Provider store={mockStore}>
        <LogoutButton />
      </Provider>
    );

    const button = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(button);

    expect(performLogout).toHaveBeenCalledTimes(1); // Check if performLogout was called
  });
});
