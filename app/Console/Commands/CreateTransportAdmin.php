<?php

namespace App\Console\Commands;

use App\Models\TransportAdmin;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

/**
 * Creates the first transport panel account.
 *
 * The panel has no sign-up page on purpose — access is granted, not requested —
 * so accounts are made here.
 */
class CreateTransportAdmin extends Command
{
    protected $signature = 'transport-admin:create
                            {--name= : The person\'s full name}
                            {--email= : The email they will sign in with}
                            {--phone= : Optional phone number}
                            {--password= : Leave blank to have one generated}';

    protected $description = 'Create an account for the transport panel';

    public function handle(): int
    {
        $name  = $this->option('name')  ?: $this->ask('Full name');
        $email = strtolower(trim($this->option('email') ?: $this->ask('Email')));
        $phone = $this->option('phone');

        // Generated when not supplied, so nobody has to invent one and a weak
        // password is not the default path.
        $password  = $this->option('password') ?: Str::random(12);
        $generated = !$this->option('password');

        $validator = Validator::make(compact('name', 'email', 'password'), [
            'name'     => 'required|string|max:255',
            'email'    => ['required', 'email', 'max:255', Rule::unique('transport_admins', 'email')],
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $admin = TransportAdmin::create([
            'full_name'    => $name,
            'email'        => $email,
            'phone_number' => $phone,
            'password'     => $password,
            'is_active'    => true,
        ]);

        $this->newLine();
        $this->info('Transport panel account created.');
        $this->table(['Field', 'Value'], [
            ['Name',     $admin->full_name],
            ['Email',    $admin->email],
            ['Password', $generated ? $password . '  (generated — save it now)' : '(as supplied)'],
            ['Sign in',  url('/transport-admin/login')],
        ]);

        return self::SUCCESS;
    }
}
