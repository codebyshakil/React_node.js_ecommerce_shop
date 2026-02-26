# 🔄 Lovable → Laravel Migration Guide
## EW Shop - Complete Conversion Documentation

---

## 📋 সূচিপত্র (Table of Contents)

1. [প্রজেক্ট ওভারভিউ](#1-প্রজেক্ট-ওভারভিউ)
2. [Laravel প্রজেক্ট সেটআপ](#2-laravel-প্রজেক্ট-সেটআপ)
3. [ডাটাবেস মাইগ্রেশন](#3-ডাটাবেস-মাইগ্রেশন)
4. [Model তৈরি](#4-model-তৈরি)
5. [Authentication ও Role System](#5-authentication-ও-role-system)
6. [RLS → Laravel Policy কনভার্শন](#6-rls--laravel-policy-কনভার্শন)
7. [Edge Functions → Controller কনভার্শন](#7-edge-functions--controller-কনভার্শন)
8. [Frontend Pages কনভার্শন](#8-frontend-pages-কনভার্শন)
9. [Admin Dashboard কনভার্শন](#9-admin-dashboard-কনভার্শন)
10. [Payment Gateway Integration](#10-payment-gateway-integration)
11. [Email System](#11-email-system)
12. [File Storage](#12-file-storage)
13. [Environment Variables](#13-environment-variables)
14. [Testing ও Deployment](#14-testing-ও-deployment)

---

## 1. প্রজেক্ট ওভারভিউ

### বর্তমান Tech Stack (Lovable)
| টেকনোলজি | ভূমিকা |
|---|---|
| React 18 + TypeScript | Frontend UI |
| Tailwind CSS + shadcn/ui | Styling ও Components |
| Supabase (PostgreSQL) | Database |
| Supabase Edge Functions (Deno) | Backend Logic |
| Supabase Auth | Authentication |
| Supabase Storage | File Storage |
| TanStack React Query | Data Fetching |
| React Router DOM | Routing |
| Framer Motion | Animations |

### টার্গেট Tech Stack (Laravel)
| টেকনোলজি | ভূমিকা |
|---|---|
| Laravel 11 + PHP 8.3 | Backend Framework |
| Laravel Breeze/Jetstream + Inertia.js | Auth + Frontend Bridge |
| React (Inertia) অথবা Blade | Frontend |
| MySQL / PostgreSQL | Database |
| Laravel Controllers | Backend Logic |
| Laravel Gate/Policy | Authorization |
| Laravel Mail | Email |
| Laravel Storage (S3/Local) | File Storage |

---

## 2. Laravel প্রজেক্ট সেটআপ

### Step 1: Laravel ইনস্টল
```bash
composer create-project laravel/laravel ew-shop
cd ew-shop
```

### Step 2: Inertia.js + React সেটআপ (Recommended)
```bash
composer require laravel/breeze --dev
php artisan breeze:install react --typescript
npm install
```

### Step 3: প্রয়োজনীয় প্যাকেজ ইনস্টল
```bash
# Authorization
composer require spatie/laravel-permission

# Payment Gateways
composer require stripe/stripe-php
composer require sslcommerz/sslcommerz

# Image Handling
composer require intervention/image

# Excel Export (Admin)
composer require maatwebsite/excel

# DOMPurify equivalent
composer require stevebauman/purify
```

### Step 4: Tailwind CSS কনফিগার
```bash
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react framer-motion recharts
```

> 📁 **কপি করুন:** `tailwind.config.ts` এবং `src/index.css` — এগুলো প্রায় হুবহু ব্যবহার করা যাবে।

---

## 3. ডাটাবেস মাইগ্রেশন

### মোট টেবিল: 25টি
প্রতিটি টেবিলের জন্য Laravel Migration তৈরি করতে হবে।

### Step 1: Migration ফাইল তৈরি

```bash
php artisan make:migration create_profiles_table
php artisan make:migration create_categories_table
php artisan make:migration create_products_table
php artisan make:migration create_variants_table
php artisan make:migration create_orders_table
php artisan make:migration create_order_items_table
php artisan make:migration create_cart_items_table
php artisan make:migration create_blog_posts_table
php artisan make:migration create_testimonials_table
php artisan make:migration create_contact_messages_table
php artisan make:migration create_coupons_table
php artisan make:migration create_coupon_usage_table
php artisan make:migration create_pages_table
php artisan make:migration create_page_sections_table
php artisan make:migration create_homepage_sections_table
php artisan make:migration create_site_settings_table
php artisan make:migration create_admin_settings_table
php artisan make:migration create_activity_logs_table
php artisan make:migration create_shipping_zones_table
php artisan make:migration create_shipping_rates_table
php artisan make:migration create_product_reviews_table
php artisan make:migration create_email_templates_table
php artisan make:migration create_email_campaigns_table
php artisan make:migration create_role_permissions_table
php artisan make:migration create_user_roles_table
```

### Step 2: Migration কোড উদাহরণ

#### `create_products_table.php`
```php
Schema::create('products', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('category_id')->nullable();
    $table->string('title');
    $table->string('slug')->unique();
    $table->text('description')->nullable();
    $table->text('short_description')->nullable();
    $table->string('image_url')->nullable();
    $table->jsonb('gallery')->default('[]');
    $table->jsonb('variations')->default('[]');
    $table->decimal('regular_price', 10, 2)->default(0);
    $table->decimal('discount_price', 10, 2)->nullable();
    $table->integer('stock_quantity')->default(0);
    $table->string('stock_status')->default('in_stock');
    $table->decimal('rating', 3, 2)->default(0);
    $table->integer('review_count')->default(0);
    $table->boolean('is_active')->default(true);
    $table->boolean('is_deleted')->default(false);
    $table->timestamp('deleted_at')->nullable();
    $table->timestamps();

    $table->foreign('category_id')->references('id')->on('categories');
});
```

#### `create_orders_table.php`
```php
Schema::create('orders', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('user_id');
    $table->decimal('total', 12, 2)->default(0);
    $table->string('status')->default('pending');
    $table->string('payment_status')->default('pending');
    $table->string('payment_method')->nullable();
    $table->string('transaction_id')->nullable();
    $table->jsonb('shipping_address')->nullable();
    $table->text('notes')->nullable();
    $table->timestamps();

    $table->foreign('user_id')->references('id')->on('users');
});
```

#### `create_profiles_table.php`
```php
Schema::create('profiles', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('user_id')->unique();
    $table->string('full_name')->default('');
    $table->string('phone')->nullable()->default('');
    $table->string('country_code')->nullable()->default('+880');
    $table->string('address')->nullable();
    $table->string('city')->nullable();
    $table->string('country')->nullable();
    $table->string('zip_code')->nullable();
    $table->string('avatar_url')->nullable();
    $table->boolean('email_verified')->default(false);
    $table->boolean('is_blocked')->default(false);
    $table->boolean('is_deleted')->default(false);
    $table->string('last_ip')->nullable();
    $table->string('blocked_ip')->nullable();
    $table->timestamp('ip_blocked_at')->nullable();
    $table->timestamp('deleted_at')->nullable();
    $table->timestamps();

    $table->foreign('user_id')->references('id')->on('users');
});
```

> ⚠️ **বাকি 22টি টেবিলের জন্যও একইভাবে migration তৈরি করুন।** Supabase types.ts ফাইল থেকে কলাম ও টাইপ রেফারেন্স নিন।

---

## 4. Model তৈরি

### Step 1: সব Model তৈরি
```bash
php artisan make:model Product
php artisan make:model Category
php artisan make:model Order
php artisan make:model OrderItem
php artisan make:model CartItem
php artisan make:model Profile
php artisan make:model BlogPost
php artisan make:model Testimonial
php artisan make:model ContactMessage
php artisan make:model Coupon
php artisan make:model CouponUsage
php artisan make:model Page
php artisan make:model PageSection
php artisan make:model HomepageSection
php artisan make:model SiteSetting
php artisan make:model AdminSetting
php artisan make:model ActivityLog
php artisan make:model ShippingZone
php artisan make:model ShippingRate
php artisan make:model ProductReview
php artisan make:model EmailTemplate
php artisan make:model EmailCampaign
php artisan make:model Variant
php artisan make:model UserRole
php artisan make:model RolePermission
```

### Step 2: Model উদাহরণ

#### `app/Models/Product.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Product extends Model
{
    use HasUuids;

    protected $fillable = [
        'category_id', 'title', 'slug', 'description', 'short_description',
        'image_url', 'gallery', 'variations', 'regular_price', 'discount_price',
        'stock_quantity', 'stock_status', 'rating', 'review_count',
        'is_active', 'is_deleted'
    ];

    protected $casts = [
        'gallery' => 'array',
        'variations' => 'array',
        'is_active' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function category() {
        return $this->belongsTo(Category::class);
    }

    public function reviews() {
        return $this->hasMany(ProductReview::class);
    }

    public function orderItems() {
        return $this->hasMany(OrderItem::class);
    }
}
```

#### `app/Models/Order.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Order extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'total', 'status', 'payment_status',
        'payment_method', 'transaction_id', 'shipping_address', 'notes'
    ];

    protected $casts = [
        'shipping_address' => 'array',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function items() {
        return $this->hasMany(OrderItem::class);
    }
}
```

---

## 5. Authentication ও Role System

### বর্তমান সিস্টেম (Lovable/Supabase)
- **ফাইল:** `src/hooks/useAuth.tsx`
- **Roles:** admin, moderator, user, sales_manager, account_manager, support_assistant, marketing_manager
- **টেবিল:** `user_roles`, `role_permissions`

### Laravel এ কনভার্শন

#### Step 1: Spatie Permission ইনস্টল
```bash
composer require spatie/laravel-permission
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan migrate
```

#### Step 2: User Model আপডেট
```php
// app/Models/User.php
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasRoles;
    // ...
}
```

#### Step 3: Roles ও Permissions Seeder
```php
// database/seeders/RolePermissionSeeder.php
$roles = ['admin', 'moderator', 'user', 'sales_manager',
          'account_manager', 'support_assistant', 'marketing_manager'];

foreach ($roles as $role) {
    Role::create(['name' => $role]);
}

// Permissions from role_permissions table
$permissions = [
    'product_view', 'product_edit', 'product_add', 'product_delete',
    'order_view', 'order_manage', 'order_status_change', 'order_delete',
    'customer_view', 'customer_edit', 'customer_status_change',
    'blog_view', 'blog_edit', 'blog_add', 'blog_delete',
    'page_access', 'page_edit', 'page_add', 'page_delete',
    'settings_access', 'settings_general',
    'shipping_access', 'shipping_manage',
    'coupon_view', 'coupon_edit', 'coupon_add', 'coupon_delete',
    'marketing_access', 'marketing_campaign_create', 'marketing_campaign_send',
    'marketing_template_manage', 'message_access', 'message_read',
    'message_status_change', 'message_delete',
    'testimonial_view', 'testimonial_edit', 'testimonial_add', 'testimonial_delete',
    'logs_access', 'variant_view', 'variant_edit', 'variant_add', 'variant_delete',
    'category_view', 'category_edit', 'category_add', 'category_delete',
];
```

### ম্যাপিং: Lovable ফাইল → Laravel ফাইল

| Lovable ফাইল | Laravel ফাইল |
|---|---|
| `src/hooks/useAuth.tsx` | `app/Http/Controllers/Auth/LoginController.php` |
| `src/pages/Login.tsx` | `resources/js/Pages/Auth/Login.tsx` (Inertia) |
| `src/pages/Register.tsx` | `resources/js/Pages/Auth/Register.tsx` (Inertia) |
| `src/pages/ForgotPassword.tsx` | `resources/js/Pages/Auth/ForgotPassword.tsx` |
| `src/pages/ResetPassword.tsx` | `resources/js/Pages/Auth/ResetPassword.tsx` |
| `src/pages/VerifyEmail.tsx` | `resources/js/Pages/Auth/VerifyEmail.tsx` |
| `src/components/ProtectedRoute.tsx` | `app/Http/Middleware/` (Laravel Middleware) |
| `src/hooks/usePermissions.ts` | `app/Policies/` + Spatie Permission |

---

## 6. RLS → Laravel Policy কনভার্শন

### বর্তমান RLS Policies (30+)
Supabase এ Row Level Security ব্যবহার হয়। Laravel এ এগুলো **Policy + Middleware** দিয়ে replace হবে।

### Step 1: Policy তৈরি
```bash
php artisan make:policy ProductPolicy --model=Product
php artisan make:policy OrderPolicy --model=Order
php artisan make:policy BlogPostPolicy --model=BlogPost
php artisan make:policy PagePolicy --model=Page
php artisan make:policy CouponPolicy --model=Coupon
php artisan make:policy TestimonialPolicy --model=Testimonial
php artisan make:policy ContactMessagePolicy --model=ContactMessage
php artisan make:policy ShippingZonePolicy --model=ShippingZone
```

### Step 2: Policy উদাহরণ

#### `app/Policies/ProductPolicy.php`
```php
<?php
// RLS: "Products are public" → viewAny returns true
// RLS: "Admins manage products" → admin gets full access
// RLS: "Staff manage products" → permission-based

class ProductPolicy
{
    public function viewAny(User $user = null): bool {
        return true; // Products are public read
    }

    public function create(User $user): bool {
        return $user->hasRole('admin') ||
               $user->hasPermissionTo('product_add');
    }

    public function update(User $user, Product $product): bool {
        return $user->hasRole('admin') ||
               $user->hasPermissionTo('product_edit');
    }

    public function delete(User $user, Product $product): bool {
        return $user->hasRole('admin') ||
               $user->hasPermissionTo('product_delete');
    }
}
```

#### `app/Policies/OrderPolicy.php`
```php
<?php
class OrderPolicy
{
    public function viewAny(User $user): bool {
        return $user->hasRole('admin') ||
               $user->hasPermissionTo('order_view') ||
               $user->hasPermissionTo('order_manage');
    }

    // RLS: "Users view own orders"
    public function view(User $user, Order $order): bool {
        return $user->id === $order->user_id ||
               $user->hasRole('admin') ||
               $user->hasPermissionTo('order_view');
    }

    // RLS: "Users create orders"
    public function create(User $user): bool {
        return true; // Any authenticated user
    }
}
```

### সম্পূর্ণ RLS → Policy ম্যাপিং টেবিল

| টেবিল | RLS Policy | Laravel Equivalent |
|---|---|---|
| products | "Products are public" | `viewAny() → true` |
| products | "Admins manage products" | `hasRole('admin')` |
| products | "Staff manage products" | `hasPermissionTo('product_*')` |
| orders | "Users view own orders" | `$user->id === $order->user_id` |
| orders | "Users create orders" | `auth.uid() = user_id` → Middleware |
| orders | "Admins manage orders" | `hasRole('admin')` |
| blog_posts | "Published blogs are public" | `where('is_published', true)` scope |
| cart_items | "Users manage own cart" | `$user->id === $cart->user_id` |
| categories | "Categories are public" | `viewAny() → true` |
| profiles | "Users can view own profile" | `$user->id === $profile->user_id` |
| coupons | "Active coupons are public read" | `where('is_active', true)` scope |
| testimonials | "Active testimonials are public" | `where('is_active', true)` scope |
| site_settings | "Settings are public read" | `viewAny() → true` |
| contact_messages | "Anyone can submit contact" | No auth required for store |

---

## 7. Edge Functions → Controller কনভার্শন

### মোট Edge Functions: 18টি

| # | Edge Function (Lovable) | Laravel Controller/Service | জটিলতা |
|---|---|---|---|
| 1 | `stripe-create-checkout/index.ts` | `PaymentController@stripeCheckout` | 🔴 কঠিন |
| 2 | `stripe-webhook/index.ts` | `WebhookController@stripeWebhook` | 🔴 কঠিন |
| 3 | `sslcommerz-init/index.ts` | `PaymentController@sslcommerzInit` | 🔴 কঠিন |
| 4 | `sslcommerz-ipn/index.ts` | `WebhookController@sslcommerzIPN` | 🔴 কঠিন |
| 5 | `bkash-init/index.ts` | `PaymentController@bkashInit` | 🔴 কঠিন |
| 6 | `bkash-callback/index.ts` | `WebhookController@bkashCallback` | 🔴 কঠিন |
| 7 | `nagad-init/index.ts` | `PaymentController@nagadInit` | 🔴 কঠিন |
| 8 | `nagad-callback/index.ts` | `WebhookController@nagadCallback` | 🔴 কঠিন |
| 9 | `paypal-create-order/index.ts` | `PaymentController@paypalCreate` | 🟡 মাঝারি |
| 10 | `paypal-capture-order/index.ts` | `PaymentController@paypalCapture` | 🟡 মাঝারি |
| 11 | `send-auth-email/index.ts` | `App\Mail\AuthEmail` (Mailable) | 🟡 মাঝারি |
| 12 | `send-marketing-email/index.ts` | `App\Mail\MarketingEmail` + Queue | 🟡 মাঝারি |
| 13 | `send-notification/index.ts` | `App\Notifications\*` | 🟢 সহজ |
| 14 | `create-employee/index.ts` | `EmployeeController@store` | 🟢 সহজ |
| 15 | `manage-employee/index.ts` | `EmployeeController@update/destroy` | 🟢 সহজ |
| 16 | `delete-user/index.ts` | `UserController@destroy` | 🟢 সহজ |
| 17 | `admin-reset-password/index.ts` | `AdminController@resetPassword` | 🟢 সহজ |
| 18 | `check-access/index.ts` | Middleware `CheckAccess` | 🟢 সহজ |
| 19 | `track-order/index.ts` | `OrderController@track` | 🟢 সহজ |

### Controller তৈরি
```bash
php artisan make:controller PaymentController
php artisan make:controller WebhookController
php artisan make:controller ProductController --resource
php artisan make:controller OrderController --resource
php artisan make:controller CartController --resource
php artisan make:controller BlogController --resource
php artisan make:controller PageController --resource
php artisan make:controller CategoryController --resource
php artisan make:controller Admin/DashboardController
php artisan make:controller Admin/SettingsController
php artisan make:controller Admin/CustomerController
php artisan make:controller Admin/EmployeeController
php artisan make:controller Admin/ShippingController
php artisan make:controller Admin/CouponController
php artisan make:controller Admin/TestimonialController
php artisan make:controller Admin/ContactController
php artisan make:controller Admin/MediaController
php artisan make:controller Admin/MarketingController
php artisan make:controller Admin/PermissionController
```

### উদাহরণ: Stripe Controller

```php
// app/Http/Controllers/PaymentController.php
<?php
namespace App\Http\Controllers;

use Stripe\Stripe;
use Stripe\Checkout\Session;

class PaymentController extends Controller
{
    // From: supabase/functions/stripe-create-checkout/index.ts
    public function stripeCheckout(Request $request)
    {
        $settings = AdminSetting::where('key', 'payment_methods')->first();
        $stripeConfig = $settings->value['stripe'] ?? null;

        Stripe::setApiKey($stripeConfig['secret_key']);

        $order = Order::with('items')->findOrFail($request->order_id);

        $lineItems = $order->items->map(fn($item) => [
            'price_data' => [
                'currency' => $stripeConfig['currency'] ?? 'usd',
                'product_data' => ['name' => $item->product_name],
                'unit_amount' => (int)($item->price * 100),
            ],
            'quantity' => $item->quantity,
        ])->toArray();

        $session = Session::create([
            'payment_method_types' => ['card'],
            'line_items' => $lineItems,
            'mode' => 'payment',
            'success_url' => config('app.url') . '/payment-success?order_id=' . $order->id,
            'cancel_url' => config('app.url') . '/payment-cancel?order_id=' . $order->id,
            'metadata' => ['order_id' => $order->id],
        ]);

        return response()->json(['url' => $session->url]);
    }
}
```

---

## 8. Frontend Pages কনভার্শন

### মোট Pages: 22টি

| # | Lovable ফাইল | Laravel (Inertia) ফাইল | জটিলতা |
|---|---|---|---|
| 1 | `src/pages/Index.tsx` | `resources/js/Pages/Home.tsx` | 🟡 মাঝারি |
| 2 | `src/pages/Products.tsx` | `resources/js/Pages/Products/Index.tsx` | 🟡 মাঝারি |
| 3 | `src/pages/ProductDetail.tsx` | `resources/js/Pages/Products/Show.tsx` | 🟡 মাঝারি |
| 4 | `src/pages/Cart.tsx` | `resources/js/Pages/Cart.tsx` | 🟡 মাঝারি |
| 5 | `src/pages/Checkout.tsx` | `resources/js/Pages/Checkout.tsx` | 🔴 কঠিন |
| 6 | `src/pages/Login.tsx` | `resources/js/Pages/Auth/Login.tsx` | 🟢 সহজ |
| 7 | `src/pages/Register.tsx` | `resources/js/Pages/Auth/Register.tsx` | 🟢 সহজ |
| 8 | `src/pages/Dashboard.tsx` | `resources/js/Pages/Dashboard.tsx` | 🟡 মাঝারি |
| 9 | `src/pages/AdminDashboard.tsx` | `resources/js/Pages/Admin/Dashboard.tsx` | 🔴 খুব কঠিন |
| 10 | `src/pages/AdminLogin.tsx` | `resources/js/Pages/Admin/Login.tsx` | 🟢 সহজ |
| 11 | `src/pages/Blog.tsx` | `resources/js/Pages/Blog/Index.tsx` | 🟢 সহজ |
| 12 | `src/pages/BlogPost.tsx` | `resources/js/Pages/Blog/Show.tsx` | 🟢 সহজ |
| 13 | `src/pages/About.tsx` | `resources/js/Pages/About.tsx` | 🟢 সহজ |
| 14 | `src/pages/Contact.tsx` | `resources/js/Pages/Contact.tsx` | 🟢 সহজ |
| 15 | `src/pages/FAQ.tsx` | `resources/js/Pages/FAQ.tsx` | 🟢 সহজ |
| 16 | `src/pages/Testimonials.tsx` | `resources/js/Pages/Testimonials.tsx` | 🟢 সহজ |
| 17 | `src/pages/OrderTracking.tsx` | `resources/js/Pages/OrderTracking.tsx` | 🟡 মাঝারি |
| 18 | `src/pages/DynamicPage.tsx` | `resources/js/Pages/DynamicPage.tsx` | 🟡 মাঝারি |
| 19 | `src/pages/PolicyPage.tsx` | `resources/js/Pages/PolicyPage.tsx` | 🟢 সহজ |
| 20 | `src/pages/PaymentSuccess.tsx` | `resources/js/Pages/Payment/Success.tsx` | 🟢 সহজ |
| 21 | `src/pages/PaymentFail.tsx` | `resources/js/Pages/Payment/Fail.tsx` | 🟢 সহজ |
| 22 | `src/pages/PaymentCancel.tsx` | `resources/js/Pages/Payment/Cancel.tsx` | 🟢 সহজ |

### Components কনভার্শন

| # | Lovable Component | Laravel Component |
|---|---|---|
| 1 | `src/components/layout/Header.tsx` | `resources/js/Components/Layout/Header.tsx` |
| 2 | `src/components/layout/Footer.tsx` | `resources/js/Components/Layout/Footer.tsx` |
| 3 | `src/components/layout/NavBar.tsx` | `resources/js/Components/Layout/NavBar.tsx` |
| 4 | `src/components/layout/TopHeader.tsx` | `resources/js/Components/Layout/TopHeader.tsx` |
| 5 | `src/components/layout/Layout.tsx` | `resources/js/Layouts/AppLayout.tsx` |
| 6 | `src/components/products/ProductCard.tsx` | `resources/js/Components/Products/ProductCard.tsx` |
| 7 | `src/components/products/VariantSelectionModal.tsx` | `resources/js/Components/Products/VariantModal.tsx` |
| 8 | `src/components/home/HeroCategorySlider.tsx` | `resources/js/Components/Home/HeroCategorySlider.tsx` |
| 9 | `src/components/home/FlashSaleCountdown.tsx` | `resources/js/Components/Home/FlashSaleCountdown.tsx` |
| 10 | `src/components/OrderStatusTracker.tsx` | `resources/js/Components/OrderStatusTracker.tsx` |
| 11 | `src/components/SEOHead.tsx` | `resources/js/Components/SEOHead.tsx` (Inertia Head) |
| 12 | `src/components/checkout/ManualPaymentModal.tsx` | `resources/js/Components/Checkout/ManualPaymentModal.tsx` |

### Hooks → Laravel/Inertia কনভার্শন

| Lovable Hook | Laravel Equivalent |
|---|---|
| `src/hooks/useAuth.tsx` | Inertia `usePage().props.auth` |
| `src/hooks/useCart.ts` | `resources/js/Hooks/useCart.ts` + API calls |
| `src/hooks/useProducts.ts` | Controller → Inertia props |
| `src/hooks/useSettings.ts` | `resources/js/Hooks/useSettings.ts` + Shared data |
| `src/hooks/useCurrency.ts` | `resources/js/Hooks/useCurrency.ts` |
| `src/hooks/usePermissions.ts` | Inertia `usePage().props.permissions` |
| `src/hooks/usePageContent.ts` | Controller → Inertia props |
| `src/hooks/useBrandColors.ts` | Shared Inertia data |
| `src/hooks/useLogActivity.ts` | Server-side logging |

---

## 9. Admin Dashboard কনভার্শন

### ⚠️ সবচেয়ে জটিল অংশ

**বর্তমান ফাইল:** `src/pages/AdminDashboard.tsx` (2000+ লাইন)
এটিকে ভেঙে ছোট ছোট পেজে কনভার্ট করতে হবে:

```
resources/js/Pages/Admin/
├── Dashboard.tsx          ← DashboardOverview
├── Products/
│   ├── Index.tsx          ← ProductsPanel
│   └── Form.tsx           ← Product Create/Edit
├── Orders/
│   ├── Index.tsx          ← OrdersPanel
│   └── Show.tsx           ← Order Details
├── Categories/
│   └── Index.tsx
├── Customers/
│   └── Index.tsx          ← CustomersPanel
├── Employees/
│   └── Index.tsx          ← EmployeesPanel
├── Blog/
│   ├── Index.tsx          ← BlogPanel
│   └── Form.tsx
├── Pages/
│   ├── Index.tsx          ← PagesPanel
│   └── Form.tsx
├── Testimonials/
│   └── Index.tsx          ← TestimonialsPanel
├── Contacts/
│   └── Index.tsx          ← ContactsPanel
├── Coupons/
│   └── Index.tsx          ← CouponsPanel
├── Shipping/
│   └── Index.tsx          ← ShippingPanel
├── Marketing/
│   └── Index.tsx          ← MarketingPanel
├── Media/
│   └── Index.tsx          ← MediaPanel
├── Settings/
│   └── Index.tsx          ← SettingsPanel
├── Permissions/
│   └── Index.tsx          ← PermissionsPanel
├── Logs/
│   └── Index.tsx          ← LogsPanel
└── HomepageSections/
    └── Index.tsx          ← HomepageSectionsPanel
```

### Admin Components ম্যাপিং

| Lovable ফাইল | Laravel ফাইল |
|---|---|
| `src/components/admin/ProductsPanel.tsx` | `resources/js/Pages/Admin/Products/Index.tsx` |
| `src/components/admin/SettingsPanel.tsx` | `resources/js/Pages/Admin/Settings/Index.tsx` |
| `src/components/admin/HeaderFooterEditor.tsx` | `resources/js/Pages/Admin/Settings/HeaderFooter.tsx` |
| `src/components/admin/RichTextEditor.tsx` | `resources/js/Components/Admin/RichTextEditor.tsx` |
| `src/components/admin/ImagePicker.tsx` | `resources/js/Components/Admin/ImagePicker.tsx` |
| `src/components/admin/PageSectionBuilder.tsx` | `resources/js/Components/Admin/PageSectionBuilder.tsx` |
| `src/components/admin/LinkEditor.tsx` | `resources/js/Components/Admin/LinkEditor.tsx` |
| `src/components/admin/AdminShared.tsx` | `resources/js/Components/Admin/Shared.tsx` |

---

## 10. Payment Gateway Integration

### Routes (Laravel)
```php
// routes/web.php
Route::middleware('auth')->group(function () {
    Route::post('/payment/stripe', [PaymentController::class, 'stripeCheckout']);
    Route::post('/payment/sslcommerz', [PaymentController::class, 'sslcommerzInit']);
    Route::post('/payment/bkash', [PaymentController::class, 'bkashInit']);
    Route::post('/payment/nagad', [PaymentController::class, 'nagadInit']);
    Route::post('/payment/paypal/create', [PaymentController::class, 'paypalCreate']);
    Route::post('/payment/paypal/capture', [PaymentController::class, 'paypalCapture']);
});

// Webhooks (no auth)
Route::post('/webhook/stripe', [WebhookController::class, 'stripeWebhook']);
Route::post('/webhook/sslcommerz', [WebhookController::class, 'sslcommerzIPN']);
Route::get('/callback/bkash', [WebhookController::class, 'bkashCallback']);
Route::get('/callback/nagad', [WebhookController::class, 'nagadCallback']);
```

### Edge Function → Controller ম্যাপিং বিস্তারিত

| Edge Function কোড | Laravel কোড |
|---|---|
| `createClient(supabaseUrl, serviceKey)` | `AdminSetting::where('key', ...)->first()` |
| `Deno.env.get('...')` | `config('services.stripe.secret')` বা DB থেকে |
| `return new Response(JSON.stringify(...))` | `return response()->json(...)` |
| `req.json()` | `$request->all()` |

---

## 11. Email System

### Edge Function → Laravel Mail

| Edge Function | Laravel Mailable |
|---|---|
| `send-auth-email/index.ts` | `App\Mail\AuthEmail` |
| `send-marketing-email/index.ts` | `App\Mail\MarketingEmail` + `App\Jobs\SendCampaign` |
| `send-notification/index.ts` | `App\Notifications\OrderNotification` |

```bash
php artisan make:mail AuthEmail --markdown=emails.auth
php artisan make:mail MarketingEmail --markdown=emails.marketing
php artisan make:notification OrderNotification
php artisan make:job SendCampaignEmails
```

---

## 12. File Storage

### বর্তমান (Supabase Storage) → Laravel Storage

```php
// config/filesystems.php
'disks' => [
    'public' => [
        'driver' => 'local',
        'root' => storage_path('app/public'),
        'url' => env('APP_URL').'/storage',
        'visibility' => 'public',
    ],
    // অথবা S3
    's3' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION'),
        'bucket' => env('AWS_BUCKET'),
    ],
],
```

| Lovable ফাইল | Storage ব্যবহার |
|---|---|
| `src/components/admin/MediaPanel.tsx` | Product images, blog images |
| `src/components/admin/ImagePicker.tsx` | Image upload handler |

---

## 13. Environment Variables

### `.env` কনফিগারেশন
```env
APP_NAME="EW Shop"
APP_URL=https://your-domain.com

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ew_shop
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Mail (SMTP)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_ADDRESS=noreply@your-domain.com

# Stripe (if not using DB config)
STRIPE_KEY=pk_live_xxx
STRIPE_SECRET=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# reCAPTCHA
RECAPTCHA_SITE_KEY=xxx
RECAPTCHA_SECRET_KEY=xxx
```

---

## 14. Testing ও Deployment

### Laravel Routes সম্পূর্ণ তালিকা

```php
// routes/web.php - সব routes একসাথে

// Public
Route::get('/', [HomeController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/blog', [BlogController::class, 'index']);
Route::get('/blog/{slug}', [BlogController::class, 'show']);
Route::get('/about', [PageController::class, 'about']);
Route::get('/contact', [ContactController::class, 'index']);
Route::post('/contact', [ContactController::class, 'store']);
Route::get('/faq', [PageController::class, 'faq']);
Route::get('/testimonials', [TestimonialController::class, 'index']);
Route::get('/order-tracking', [OrderController::class, 'track']);
Route::get('/page/{slug}', [PageController::class, 'show']);
Route::get('/policy/{type}', [PageController::class, 'policy']);

// Auth
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/forgot-password', [AuthController::class, 'showForgotPassword']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::get('/reset-password/{token}', [AuthController::class, 'showResetPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Authenticated User
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::put('/cart/{id}', [CartController::class, 'update']);
    Route::delete('/cart/{id}', [CartController::class, 'destroy']);
    Route::get('/checkout', [CheckoutController::class, 'index']);
    Route::post('/checkout', [CheckoutController::class, 'store']);
});

// Admin
Route::middleware(['auth', 'role:admin|moderator|sales_manager|account_manager|support_assistant|marketing_manager'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', [Admin\DashboardController::class, 'index']);
        Route::resource('products', Admin\ProductController::class);
        Route::resource('orders', Admin\OrderController::class);
        Route::resource('categories', Admin\CategoryController::class);
        Route::resource('customers', Admin\CustomerController::class);
        Route::resource('employees', Admin\EmployeeController::class);
        Route::resource('blog', Admin\BlogController::class);
        Route::resource('pages', Admin\PageController::class);
        Route::resource('testimonials', Admin\TestimonialController::class);
        Route::resource('contacts', Admin\ContactController::class);
        Route::resource('coupons', Admin\CouponController::class);
        Route::resource('shipping-zones', Admin\ShippingController::class);
        Route::get('/settings', [Admin\SettingsController::class, 'index']);
        Route::put('/settings', [Admin\SettingsController::class, 'update']);
        Route::get('/marketing', [Admin\MarketingController::class, 'index']);
        Route::get('/media', [Admin\MediaController::class, 'index']);
        Route::get('/permissions', [Admin\PermissionController::class, 'index']);
        Route::get('/logs', [Admin\LogController::class, 'index']);
    });
```

### Deployment Checklist
- [ ] সব Migration রান করুন: `php artisan migrate`
- [ ] Seeder রান করুন: `php artisan db:seed`
- [ ] Storage link: `php artisan storage:link`
- [ ] Cache: `php artisan config:cache && php artisan route:cache`
- [ ] Queue worker: `php artisan queue:work`
- [ ] SSL Certificate সেটআপ
- [ ] Stripe Webhook URL আপডেট
- [ ] Environment variables সেট

---

## 📊 সারাংশ

| বিভাগ | ফাইল সংখ্যা | আনুমানিক সময় |
|---|---|---|
| Database Migration | 25 | 3-4 দিন |
| Models | 25 | 2-3 দিন |
| Auth + Roles | 8-10 | 4-5 দিন |
| Policies (RLS) | 10-12 | 3-4 দিন |
| Controllers (Edge Functions) | 18 | 10-15 দিন |
| Frontend Pages | 22 | 15-20 দিন |
| Admin Panel | 18+ | 20-30 দিন |
| Payment Integration | 10 | 7-10 দিন |
| Email System | 5 | 3-4 দিন |
| Testing | - | 5-7 দিন |
| **মোট** | **150+** | **70-100 দিন** |

---

> 📝 **নোট:** এই গাইড একটি রেফারেন্স ডকুমেন্ট। প্রতিটি সেকশন বিস্তারিতভাবে implement করার সময় Lovable প্রজেক্টের সোর্স কোড দেখে নেওয়া উচিত।
>
> 📥 **সোর্স কোড পেতে:** Settings → GitHub → Connect করে সম্পূর্ণ কোড ডাউনলোড করুন।
