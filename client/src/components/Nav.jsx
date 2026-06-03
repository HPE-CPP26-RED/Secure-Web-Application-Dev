import { Badge, Button, Dropdown, DropdownItem, Transition } from "@windmill/react-ui";
import { useCart } from "context/CartContext";
import { useUser } from "context/UserContext";
import { useEffect, useState } from "react";
import { LogOut, Moon, ShoppingCart, Sun, User } from "react-feather";
import { Link } from "react-router-dom";

const Nav = () => {
  const { cartTotal } = useCart();
  const { isLoggedIn, userData, logout } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(
    typeof window !== "undefined" &&
      (localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches))
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/70 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-neutral-950/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center">
          <span className="text-xl font-semibold tracking-[0.2em] text-neutral-900 transition-opacity group-hover:opacity-70 dark:text-white">
            VANTAGE
          </span>
        </Link>

        {/* Right Side */}
        <ul className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <li>
            <button
              onClick={() => setIsDark(!isDark)}
              aria-label="Toggle theme"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/80 bg-white/50 text-neutral-700 transition-all duration-300 hover:scale-105 hover:bg-white hover:text-neutral-900 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </li>

          {/* Cart */}
          <li>
            <Link
              to="/cart"
              className="relative flex h-10 items-center gap-2 rounded-full border border-neutral-200/80 bg-white/50 px-4 text-sm font-medium text-neutral-800 transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:text-neutral-900 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              {cartTotal > 0 && (
                <span className="ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-900">
                  {cartTotal}
                </span>
              )}
            </Link>
          </li>

          {/* Not Logged In */}
          {!isLoggedIn && (
            <li>
              <Link
                to="/login"
                className="flex h-10 items-center rounded-full bg-neutral-900 px-5 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Login
              </Link>
            </li>
          )}

          {/* Logged In */}
          {isLoggedIn && (
            <li className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="Account menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/80 bg-white/50 text-neutral-800 transition-all duration-300 hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <User size={16} />
              </button>

              <Transition
                show={isDropdownOpen}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dropdown
                  isOpen={isDropdownOpen}
                  onClose={() => setIsDropdownOpen(false)}
                  align="right"
                  className="mt-3 w-60 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/90 p-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/90"
                >
                  <DropdownItem className="!cursor-default">
                    <div className="flex flex-col px-1 py-1">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {userData?.fullname}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        @{userData?.username}
                      </span>
                    </div>
                  </DropdownItem>

                  {userData?.role === "admin" && (
                    <DropdownItem tag="a">
                      <Link className="w-full text-sm" to="/admin">
                        Admin Dashboard
                      </Link>
                    </DropdownItem>
                  )}

                  <DropdownItem tag="a">
                    <Link className="w-full text-sm" to="/profile">
                      Profile
                    </Link>
                  </DropdownItem>

                  <DropdownItem tag="a">
                    <Link className="w-full text-sm" to="/orders">
                      Orders
                    </Link>
                  </DropdownItem>

                  <DropdownItem className="mt-1 border-t border-neutral-200/80 dark:border-white/10">
                    <Link
                      className="flex w-full items-center justify-between text-sm"
                      onClick={() => logout()}
                      to="/login"
                    >
                      Logout
                      <LogOut size={16} />
                    </Link>
                  </DropdownItem>
                </Dropdown>
              </Transition>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Nav;
