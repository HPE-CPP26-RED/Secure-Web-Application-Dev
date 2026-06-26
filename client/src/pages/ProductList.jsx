import { Pagination } from "@windmill/react-ui";
import Product from "components/Product";
import Spinner from "components/Spinner";
import { useProduct } from "context/ProductContext";
import Layout from "layout/Layout";

const ProductList = () => {
  const { products, setPage } = useProduct();

  const handleChange = (page) => {
    setPage(page);
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  if (!products) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center bg-white dark:bg-[#0a0a0a]">
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen w-full overflow-x-hidden bg-white text-black transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-black/10 dark:border-white/10">
          {/* Background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

          <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-28 sm:px-8 lg:px-12 lg:pb-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-neutral-700 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
                PREMIUM MARKETPLACE
              </span>

              <h1 className="mt-6 text-5xl font-black tracking-tight text-black dark:text-white sm:text-6xl lg:text-7xl">
                Shop smarter with modern ecommerce.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">
                Discover premium products with a sleek and modern shopping experience built for
                speed and simplicity.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="#products"
                  className="rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition hover:scale-105 dark:bg-white dark:text-black"
                >
                  Explore Products →
                </a>

                <a
                  href="#products"
                  className="rounded-full border border-black/10 bg-black/5 px-7 py-3 text-sm font-semibold text-black transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  View Catalog
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section
          id="products"
          className="mx-auto w-full max-w-auto px-6 py-16 sm:px-8 lg:px-12 lg:py-20"
        >
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white">
                Featured products
              </h2>

              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Hand-picked items, curated for quality.
              </p>
            </div>

            <span className="hidden text-xs uppercase tracking-[0.3em] text-neutral-500 sm:block">
              {products?.length ?? 0} ITEMS
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products?.map((prod) => (
              <div
                key={prod._id ?? prod.id ?? prod.name}
                className="transition duration-300 hover:-translate-y-1"
              >
                <Product product={prod} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-16 flex justify-center">
            <div className="rounded-full border border-black/10 bg-black/5 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/5">
              <Pagination
                totalResults={products?.length || 0}
                resultsPerPage={12}
                onChange={handleChange}
                label="Page navigation"
              />
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ProductList;
