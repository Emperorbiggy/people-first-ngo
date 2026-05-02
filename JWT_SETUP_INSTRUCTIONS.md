# JWT Authentication Setup for Laravel NGO Application

## Installation
Once network connectivity is restored, run:
```bash
composer require tymon/jwt-auth
```

## Configuration Steps

### 1. Publish the configuration
```bash
php artisan vendor:publish --provider="Tymon\JWTAuth\Providers\LaravelServiceProvider"
```

### 2. Generate JWT Secret
```bash
php artisan jwt:secret
```

### 3. Configure User Model
Update `app/Models/User.php` to implement JWTSubject:

```php
<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    // Rest of your existing User model code...

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [];
    }
}
```

### 4. Update Auth Guard
In `config/auth.php`, update the guards array:

```php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],
    
    'api' => [
        'driver' => 'jwt',
        'provider' => 'users',
        'hash' => false,
    ],
],
```

### 5. Create API Auth Controller
Create `app/Http/Controllers/API/AuthController.php`:

```php
<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = Auth::login($user);

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'user' => $user,
            'authorisation' => [
                'token' => $token,
                'type' => 'bearer',
            ]
        ]);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $credentials = $request->only('email', 'password');

        if (!$token = Auth::attempt($credentials)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized',
            ], 401);
        }

        $user = Auth::user();

        return response()->json([
            'status' => 'success',
            'user' => $user,
            'authorisation' => [
                'token' => $token,
                'type' => 'bearer',
            ]
        ]);
    }

    public function logout()
    {
        Auth::logout();
        return response()->json([
            'status' => 'success',
            'message' => 'Successfully logged out',
        ]);
    }

    public function refresh()
    {
        return response()->json([
            'status' => 'success',
            'user' => Auth::user(),
            'authorisation' => [
                'token' => Auth::refresh(),
                'type' => 'bearer',
            ]
        ]);
    }

    public function me()
    {
        return response()->json([
            'status' => 'success',
            'user' => Auth::user(),
        ]);
    }
}
```

### 6. Add API Routes
In `routes/api.php`:

```php
<?php

use App\Http\Controllers\API\AuthController;
use Illuminate\Support\Facades\Route;

Route::group([
    'middleware' => 'api',
    'prefix' => 'auth'
], function ($router) {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::get('/me', [AuthController::class, 'me']);
});

// Protected routes for NGO applications
Route::group([
    'middleware' => 'api',
    'prefix' => 'ngo'
], function ($router) {
    Route::get('/applications', [NgoContractApplicationController::class, 'index']);
    Route::get('/applications/{id}', [NgoContractApplicationController::class, 'show']);
    Route::post('/applications', [NgoContractApplicationController::class, 'store']);
});
```

### 7. Update NGO Controller for API
Update `NgoContractApplicationController` to handle API requests:

```php
// Add these methods to your existing controller

public function apiIndex()
{
    $applications = NgoContractApplication::latest()->get();
    return response()->json([
        'status' => 'success',
        'data' => $applications
    ]);
}

public function apiShow($id)
{
    $application = NgoContractApplication::find($id);
    
    if (!$application) {
        return response()->json([
            'status' => 'error',
            'message' => 'Application not found'
        ], 404);
    }

    return response()->json([
        'status' => 'success',
        'data' => $application
    ]);
}

public function apiStore(Request $request)
{
    // Use the same validation as your existing store method
    // but return JSON responses instead of redirects
}
```

## Usage in React Frontend

### JWT Service
Create `resources/js/services/jwt.js`:

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/';

class AuthService {
  login(email, password) {
    return axios
      .post(API_URL + 'auth/login', {
        email,
        password
      })
      .then(response => {
        if (response.data.authorisation.token) {
          localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
      });
  }

  logout() {
    localStorage.removeItem('user');
    return axios.post(API_URL + 'auth/logout').then(response => {
      return response.data;
    });
  }

  register(name, email, password, password_confirmation) {
    return axios.post(API_URL + 'auth/register', {
      name,
      email,
      password,
      password_confirmation
    });
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  }

  getAuthHeader() {
    const user = this.getCurrentUser();
    if (user && user.authorisation.token) {
      return { Authorization: 'Bearer ' + user.authorisation.token };
    }
    return {};
  }
}

export default new AuthService();
```

### API Service
Create `resources/js/services/api.js`:

```javascript
import axios from 'axios';
import AuthService from './jwt';

const API_URL = 'http://localhost:8000/api/';

class ApiService {
  // NGO Application methods
  getApplications() {
    return axios.get(API_URL + 'ngo/applications', {
      headers: AuthService.getAuthHeader()
    });
  }

  getApplication(id) {
    return axios.get(API_URL + `ngo/applications/${id}`, {
      headers: AuthService.getAuthHeader()
    });
  }

  submitApplication(formData) {
    return axios.post(API_URL + 'ngo/applications', formData, {
      headers: {
        ...AuthService.getAuthHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}

export default new ApiService();
```

## Testing JWT

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123","password_confirmation":"password123"}'
```

### Login User
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Access Protected Route
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Considerations

1. Always use HTTPS in production
2. Set reasonable token expiration times
3. Implement token refresh mechanism
4. Store tokens securely (consider httpOnly cookies for web apps)
5. Validate and sanitize all input data
6. Implement rate limiting for authentication endpoints
