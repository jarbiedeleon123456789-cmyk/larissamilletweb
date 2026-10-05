(function () {
  "use strict";

  var CFG = window.MARROWS || {};
  var API = (CFG.apiUrl || "").replace(/\/+$/, "");
  var STORE = "marrows.session";

  // ---------- storage helpers (never throw) ----------
  function readSession() {
    try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; }
  }
  function writeSession(s) {
    try {
      if (s) localStorage.setItem(STORE, JSON.stringify(s)); else localStorage.removeItem(STORE);
    } catch (e) { /* storage unavailable */ }
  }

  // ---------- API client ----------
  var session = readSession();
  var refreshing = null;

  function rawFetch(path, opts) {
    opts = opts || {};
    var headers = { "Accept": "application/json" };
    if (opts.body) headers["Content-Type"] = "application/json";
    if (opts.auth && session && session.tokens) headers["Authorization"] = "Bearer " + session.tokens.access_token;
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = {};
        try { data = txt ? JSON.parse(txt) : {}; } catch (e) { data = {}; }
        if (!res.ok) {
          var err = new Error(data.error || ("Request failed (" + res.status + ")"));
          err.status = res.status;
          err.fields = data.fields || {};
          throw err;
        }
        return data;
      });
    }, function () {
      var err = new Error("Cannot reach the server. Check your connection and try again.");
      err.status = 0;
      err.fields = {};
      throw err;
    });
  }

  function refreshTokens() {
    if (!session || !session.tokens) return Promise.reject(new Error("No session"));
    if (!refreshing) {
      refreshing = rawFetch("/api/auth/refresh", { method: "POST", body: { refresh_token: session.tokens.refresh_token } })
        .then(function (d) {
          session.tokens = d.tokens;
          writeSession(session);
        })
        .finally(function () { refreshing = null; });
    }
    return refreshing;
  }

  function api(path, opts) {
    opts = opts || {};
    return rawFetch(path, opts).catch(function (err) {
      if (opts.auth && err.status === 401 && !opts._retried) {
        return refreshTokens().then(function () {
          opts._retried = true;
          return rawFetch(path, opts);
        }, function () {
          var e = new Error("Your session has ended. Please sign in again.");
          e.status = 401;
          e.fields = {};
          throw e;
        });
      }
      throw err;
    });
  }

  // ---------- formatting ----------
  var peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  var emptyRes = function () {
    return { guest_name: "", email: "", phone: "", party_size: 2, reserve_date: "", reserve_time: "", note: "" };
  };
  var emptyDish = function () {
    return { id: null, product_name: "", category: "Mains", description: "", price: "", quantity: "" };
  };

  var filipinoMenu = [
    {
      id: "roasted-bone-marrow", category: "To begin", product_name: "Roasted Bone Marrow",
      description: "Roasted canoe bones, parsley-caper salad and grilled sourdough.",
      price: 520, image: "assets/images/menu/bone-marrow.jpg", imageAlt: "Roasted bone marrow with toasted bread",
      photoBy: "Ewan Munro", license: "CC BY-SA 2.0", isBestSeller: true,
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:St_John_Restaurant,_Smithfield,_London_(4409853989).jpg"
    },
    {
      id: "sisig", category: "To begin", product_name: "Kapampangan Pork Sisig",
      description: "Sizzling chopped pork with calamansi, onion and a little heat.",
      price: 520, image: "assets/images/menu/sisig.jpg", imageAlt: "Kapampangan pork sisig",
      photoBy: "Ralff Nestor Nacor", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Kapampangan_Sisig,_Dec_2025.jpg"
    },
    {
      id: "lumpia", category: "To begin", product_name: "Fresh Lumpiang Sariwa",
      description: "Tender vegetables wrapped in a soft crepe with a rich peanut-garlic sauce.",
      price: 360, image: "assets/images/menu/lumpia.jpg", imageAlt: "Fresh lumpiang sariwa with peanut sauce",
      photoBy: "ChristianCelestial", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Fresh_lumpia_(Lumpiang_sariwa).jpg"
    },
    {
      id: "adobo", category: "Mains", product_name: "Chicken Adobo",
      description: "Chicken braised in soy, vinegar, garlic and bay, served with rice.",
      price: 480, image: "assets/images/menu/chicken-adobo.jpg", imageAlt: "Filipino chicken adobo",
      photoBy: "Joy D. Ganaden", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Adobo_DSCF4391.jpg"
    },
    {
      id: "sinigang", category: "Mains", product_name: "Sinigang na Isda",
      description: "A bright, tamarind-soured fish soup with seasonal vegetables.",
      price: 620, image: "assets/images/menu/sinigang.jpg", imageAlt: "Filipino sinigang with fish and vegetables",
      photoBy: "Judgefloro", license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2949Cuisine_Meals_in_Bulacan_Sinigang_25.jpg"
    },
    {
      id: "kare-kare", category: "Mains", product_name: "Kare-Kare with Bagnet",
      description: "Peanut-rich kare-kare with crisp pork and vegetables; bagoong on the side.",
      price: 760, image: "assets/images/menu/kare-kare.jpg", imageAlt: "Pork kare-kare",
      photoBy: "Lyraauce", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Bagnet_Kare_Kare.jpg"
    },
    {
      id: "lechon-kawali", category: "Mains", product_name: "Lechon Kawali",
      description: "Crisp pork belly with a tender center and a tangy dipping sauce.",
      price: 680, image: "assets/images/menu/lechon-kawali.jpg", imageAlt: "Crisp pieces of Filipino lechon kawali",
      photoBy: "Aerous", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lechon_Kawali_sa_handaan.jpg"
    },
    {
      id: "bulalo", category: "Mains", product_name: "Batangas Bulalo",
      description: "Slow-simmered beef shank and marrow with sweet corn and greens.",
      price: 790, image: "assets/images/menu/bulalo.jpg", imageAlt: "Batangas bulalo beef shank soup",
      photoBy: "LReformado", license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:BULALO.jpg"
    },
    {
      id: "lomi", category: "Mains", product_name: "Batangas Lomi",
      description: "Thick egg noodles in a rich, savory broth with pork, vegetables and a soft egg.",
      price: 420, image: "assets/images/menu/lomi.jpg", imageAlt: "A bowl of Batangas lomi noodle soup",
      photoBy: "Markadan", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lomi_Batangas.jpg"
    },
    {
      id: "pancit", category: "Mains", product_name: "Pancit Canton",
      description: "Stir-fried noodles with vegetables, citrus and a choice of chicken or pork.",
      price: 460, image: "assets/images/menu/pancit.jpg", imageAlt: "Filipino pancit canton noodles with meat and vegetables",
      photoBy: "mooglet", license: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Pancit_Canton.jpg"
    },
    {
      id: "bistek", category: "Mains", product_name: "Bistek Tagalog",
      description: "Beef and sweet onions in a savory calamansi-soy sauce, served with rice.",
      price: 590, image: "assets/images/menu/bistek.jpg", imageAlt: "Bistek Tagalog beef with onions",
      photoBy: "Arnold Gatilao", license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Bistek_Tagalog-01.jpg"
    },
    {
      id: "halo-halo", category: "Sweet", product_name: "Halo-Halo",
      description: "Shaved ice, sweet beans and fruit, leche flan and ube ice cream.",
      price: 320, image: "assets/images/menu/halo-halo.jpg", imageAlt: "Halo-halo topped with ube ice cream",
      photoBy: "Herbertkikoy", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Halo-Halo.jpg"
    },
    {
      id: "turon", category: "Sweet", product_name: "Banana Turon",
      description: "Caramelized saba banana wrapped crisp, finished with a touch of langka.",
      price: 240, image: "assets/images/menu/turon.jpg", imageAlt: "Golden Filipino banana turon",
      photoBy: "Herbertkikoy", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Pinoy_Turon.jpg"
    },
    {
      id: "leche-flan", category: "Sweet", product_name: "Leche Flan",
      description: "Silky baked custard with a deep golden caramel.",
      price: 260, image: "assets/images/menu/leche-flan.jpg", imageAlt: "Golden Filipino leche flan",
      photoBy: "Judgefloro", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:0002jfDesserts_Pampanga_Philippinesfvf_07.JPG"
    }
  ];

  var app = Vue.createApp({
    data: function () {
      var times = [];
      for (var h = 17; h <= 22; h++) { times.push(pad(h) + ":00"); if (h < 22) times.push(pad(h) + ":30"); }
      return {
        view: "site",
        scrolled: false,
        site: {
          address: CFG.address || "", phone: CFG.phone || "", email: CFG.email || "", hours: CFG.hours || []
        },
        year: new Date().getFullYear(),
        today: todayStr(),
        times: times,

        // public menu
        menu: [],
        menuState: "loading",
        filipinoMenu: filipinoMenu,

        // reservation form
        res: emptyRes(), resErr: {}, resFail: "", resBusy: false, booked: "",

        // auth
        user: session ? session.user : null,
        scopes: session && session.scopes ? session.scopes : [],
        loginForm: { login: "", password: "" }, loginError: "", loginBusy: false,

        // dashboard
        tab: "dishes",
        products: [], listState: "loading",
        reservations: [], resState: "loading",
        toast: null, toastTimer: null,

        dishOpen: false, dish: emptyDish(), dishErr: {}, dishFail: "", dishBusy: false,
        toDelete: null, delBusy: false
      };
    },
    computed: {
      categories: function () {
        var order = [], map = {};
        this.menu.forEach(function (d) {
          if (!map[d.category]) { map[d.category] = []; order.push(d.category); }
          map[d.category].push(d);
        });
        var rank = ["To begin", "Mains", "Sweet", "Drinks"];
        order.sort(function (a, b) {
          var ia = rank.indexOf(a), ib = rank.indexOf(b);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });
        return order.map(function (n) { return { name: n, items: map[n] }; });
      },
      filipinoCategories: function () {
        var order = [], map = {};
        var liveHasBoneMarrow = this.menu.some(function (dish) {
          return /bone marrow/i.test(dish.product_name || "");
        });
        this.filipinoMenu.forEach(function (dish) {
          if (dish.isBestSeller && liveHasBoneMarrow) return;
          if (!map[dish.category]) { map[dish.category] = []; order.push(dish.category); }
          map[dish.category].push(dish);
        });
        return order.map(function (name) { return { name: name, items: map[name] }; });
      },
      canWrite: function () { return this.scopes.indexOf("write") !== -1; },
      canDelete: function () { return this.scopes.indexOf("delete") !== -1; }
    },
    methods: {
      money: function (v) { return peso.format(Number(v) || 0); },
      isBestSellerDish: function (dish) { return /bone marrow/i.test(dish.product_name || ""); },

      // ----- routing -----
      route: function () {
        var h = window.location.hash || "#/";
        if (h.indexOf("#/staff") === 0) {
          if (session && session.tokens) {
            this.view = "dashboard";
            this.user = session.user;
            this.scopes = session.scopes || [];
            this.loadProducts();
          } else {
            this.view = "login";
          }
          window.scrollTo(0, 0);
        } else {
          this.view = "site";
          if (!this.menu.length) this.loadMenu();
        }
      },
      goTop: function () { window.scrollTo({ top: 0, behavior: "smooth" }); },
      scrollTo: function (id) {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      },

      // ----- toast -----
      notify: function (text, kind) {
        var self = this;
        this.toast = { text: text, kind: kind || "ok" };
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(function () { self.toast = null; }, 4000);
      },
      endSession: function (message) {
        session = null;
        writeSession(null);
        this.user = null;
        this.scopes = [];
        this.loginError = message || "";
        window.location.hash = "#/staff/login";
        this.view = "login";
      },
      handleAuthError: function (err) {
        if (err.status === 401) { this.endSession(err.message); return true; }
        return false;
      },

      // ----- public menu -----
      loadMenu: function () {
        var self = this;
        this.menuState = "loading";
        api("/api/menu").then(function (d) {
          self.menu = d.data || [];
          self.menuState = "ready";
        }, function () { self.menuState = "error"; });
      },

      // ----- reservation -----
      submitReservation: function () {
        var self = this;
        this.resErr = {}; this.resFail = "";
        var e = {}, r = this.res;
        if (!r.guest_name) e.guest_name = "Enter your name.";
        if (!/^\S+@\S+\.\S+$/.test(r.email)) e.email = "Enter a valid email.";
        if (!r.party_size || r.party_size < 1 || r.party_size > 20) e.party_size = "Party size must be 1 to 20.";
        if (!r.reserve_date || r.reserve_date < this.today) e.reserve_date = "Pick a date from today onward.";
        if (!r.reserve_time) e.reserve_time = "Pick a time.";
        if (Object.keys(e).length) { this.resErr = e; return; }
        this.resBusy = true;
        api("/api/reservations", { method: "POST", body: r }).then(function (d) {
          self.booked = d.message || "We will confirm by email.";
          self.res = emptyRes();
        }, function (err) {
          self.resErr = err.fields || {};
          self.resFail = Object.keys(err.fields || {}).length ? "" : err.message;
        }).finally(function () { self.resBusy = false; });
      },

      // ----- auth -----
      signIn: function () {
        var self = this;
        this.loginError = "";
        if (!this.loginForm.login || !this.loginForm.password) {
          this.loginError = "Enter your username or email and your password.";
          return;
        }
        this.loginBusy = true;
        api("/api/auth/login", { method: "POST", body: this.loginForm }).then(function (d) {
          var scopes = [];
          var role = d.user && d.user.role;
          if (role === "admin") scopes = ["read", "write", "delete"]; else scopes = ["read"];
          session = { user: d.user, tokens: d.tokens, scopes: scopes };
          writeSession(session);
          self.loginForm = { login: "", password: "" };
          window.location.hash = "#/staff";
          self.route();
        }, function (err) {
          self.loginError = err.message;
        }).finally(function () { self.loginBusy = false; });
      },
      signOut: function () {
        var rt = session && session.tokens ? session.tokens.refresh_token : null;
        api("/api/auth/logout", { method: "POST", body: { refresh_token: rt } }).catch(function () {});
        this.endSession("");
        window.location.hash = "#/";
        this.route();
      },

      // ----- dishes -----
      loadProducts: function () {
        var self = this;
        this.listState = "loading";
        api("/api/products", { auth: true }).then(function (d) {
          self.products = d.data || [];
          self.listState = "ready";
        }, function (err) {
          if (!self.handleAuthError(err)) self.listState = "error";
        });
      },
      openDish: function (p) {
        this.dishErr = {}; this.dishFail = "";
        this.dish = p
          ? { id: p.id, product_name: p.product_name, category: p.category, description: p.description || "", price: p.price, quantity: p.quantity }
          : emptyDish();
        this.dishOpen = true;
      },
      saveDish: function () {
        var self = this, d = this.dish, e = {};
        this.dishErr = {}; this.dishFail = "";
        if (!d.product_name) e.product_name = "Name is required.";
        if (!d.category) e.category = "Course is required.";
        if (d.price === "" || isNaN(Number(d.price)) || Number(d.price) < 0) e.price = "Enter a price of 0 or more.";
        if (d.quantity === "" || !/^\d+$/.test(String(d.quantity))) e.quantity = "Enter a whole number of 0 or more.";
        if (Object.keys(e).length) { this.dishErr = e; return; }

        var body = {
          product_name: d.product_name, category: d.category, description: d.description,
          price: Number(d.price), quantity: parseInt(d.quantity, 10)
        };
        this.dishBusy = true;
        var req = d.id
          ? api("/api/products/" + d.id, { method: "PUT", auth: true, body: body })
          : api("/api/products", { method: "POST", auth: true, body: body });
        req.then(function (resp) {
          self.dishOpen = false;
          self.notify(d.id ? "Dish updated." : "Dish added.");
          self.loadProducts();
        }, function (err) {
          if (self.handleAuthError(err)) return;
          self.dishErr = err.fields || {};
          self.dishFail = Object.keys(err.fields || {}).length ? "" : err.message;
        }).finally(function () { self.dishBusy = false; });
      },
      askDelete: function (p) { this.toDelete = p; },
      confirmDelete: function () {
        var self = this, p = this.toDelete;
        this.delBusy = true;
        api("/api/products/" + p.id, { method: "DELETE", auth: true }).then(function () {
          self.toDelete = null;
          self.notify("Dish deleted.");
          self.loadProducts();
        }, function (err) {
          if (self.handleAuthError(err)) return;
          self.toDelete = null;
          self.notify(err.message, "bad");
        }).finally(function () { self.delBusy = false; });
      },

      // ----- reservations (staff) -----
      loadReservations: function () {
        var self = this;
        this.resState = "loading";
        api("/api/reservations", { auth: true }).then(function (d) {
          self.reservations = d.data || [];
          self.resState = "ready";
        }, function (err) {
          if (!self.handleAuthError(err)) self.resState = "error";
        });
      },
      setStatus: function (r, status) {
        var self = this;
        api("/api/reservations/" + r.id, { method: "PATCH", auth: true, body: { status: status } }).then(function () {
          r.status = status;
          self.notify("Reservation " + status + ".");
        }, function (err) {
          if (!self.handleAuthError(err)) self.notify(err.message, "bad");
        });
      },
      removeReservation: function (r) {
        var self = this;
        if (!window.confirm("Delete the reservation for " + r.guest_name + "?")) return;
        api("/api/reservations/" + r.id, { method: "DELETE", auth: true }).then(function () {
          self.reservations = self.reservations.filter(function (x) { return x.id !== r.id; });
          self.notify("Reservation deleted.");
        }, function (err) {
          if (!self.handleAuthError(err)) self.notify(err.message, "bad");
        });
      }
    },
    mounted: function () {
      var self = this;
      if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.$nextTick(function () {
          var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
              }
            });
          }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
          document.querySelectorAll(".story-text, .facts > div, .section-head, .filipino-course > h3, .filipino-card").forEach(function (element) {
            element.classList.add("reveal");
            observer.observe(element);
          });
        });
      }
      window.addEventListener("hashchange", function () {
        if (window.location.hash.indexOf("#/staff") === 0 || window.location.hash === "#/" || window.location.hash === "") self.route();
      });
      window.addEventListener("scroll", function () { self.scrolled = window.scrollY > 40; }, { passive: true });
      window.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") { self.dishOpen = false; self.toDelete = null; }
      });
      this.route();
    }
  });

  app.mount("#app");
})();
