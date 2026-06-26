import Nav from "components/Nav";
import Spinner from "components/Spinner";
import { Helmet } from "react-helmet-async";

const Layout = ({ children, title, loading }) => {
  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{title ?? "Home"} | Vantage </title>
        <meta name="description" content="Vantage Marketplace - Premium e-commerce experience" />
        <meta
          name="robots"
          content="max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <link rel="canonical" href="https://vantage-marketplace.netlify.app/" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Vantage" />
        <meta
          property="og:description"
          content="Vantage Marketplace - Premium e-commerce experience"
        />
        <meta property="og:url" content="https://vantage-marketplace.netlify.app/" />
        <meta property="og:site_name" content="Vantage" />
        <meta property="og:image" content="android-chrome-512x512.png" />
        <meta property="og:image:secure_url" content="android-chrome-512x512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@AravindKamath" />
        <meta name="twitter:creator" content="@AravindKamath" />
        <meta
          name="twitter:description"
          content="Vantage Marketplace - Premium e-commerce experience"
        />
        <meta name="twitter:title" content="Vantage" />
        <meta name="twitter:image" content="android-chrome-512x512.png" />
        <style type="text/css">{`
        html,body{
          height: 100%;
        }
    `}</style>
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Nav />
        {loading ? (
          <>
            <Spinner size={100} loading />
          </>
        ) : (
          <div className="text-gray-700 mt-1 mx-auto px-2 lg:px-56 flex-grow h-full w-full">
            <main className="h-full">{children}</main>
          </div>
        )}

        <footer className="mt-10 flex justify-center py-4 bg-[#121212] border-t border-gray-800">
          <p className="text-sm text-gray-400 sm:ml-4 sm:pl-4 sm:py-2 sm:mt-0 mt-4">
            &copy; {new Date().getFullYear()} Vantage —
            <a
              href="https://github.com/orgs/HPE-CPP26-RED/dashboard"
              className="text-white hover:text-[#01A982] ml-1 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              @Team Red
            </a>
          </p>
        </footer>
      </div>
    </>
  );
};

export default Layout;
