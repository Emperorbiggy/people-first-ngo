<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Brings the attendance table to its final shape: surname / firstname /
 * othernames / lga / lga_id / phone_number.
 *
 * The create migration was edited twice while this feature was being built, so
 * an environment that ran an earlier version of it is stuck with the old
 * columns — the create migration is already recorded as run and will never
 * fire again. Every step here is guarded by hasColumn(), so this converges any
 * of those earlier shapes to the current one and is a no-op where the table is
 * already correct.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('attendance')) {
            return;
        }

        // 1. Add the split-name columns. Left nullable so this runs without
        //    doctrine/dbal and never fails on rows that predate them; the
        //    importer is what enforces surname/firstname being present.
        Schema::table('attendance', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance', 'surname')) {
                $table->string('surname')->nullable()->after('id');
            }
            if (!Schema::hasColumn('attendance', 'firstname')) {
                $table->string('firstname')->nullable()->after('surname');
            }
            if (!Schema::hasColumn('attendance', 'othernames')) {
                $table->string('othernames')->nullable()->after('firstname');
            }
        });

        // 2. Add LGA columns if this environment never got them.
        Schema::table('attendance', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance', 'lga')) {
                $table->string('lga')->nullable()->after('othernames');
            }
            if (!Schema::hasColumn('attendance', 'lga_id')) {
                $table->foreignId('lga_id')->nullable()->after('lga')->constrained('lgas')->nullOnDelete();
            }
        });

        // 3. Carry any existing single-column name across, then drop it.
        //    "Ada Chinwe Obi" -> surname Ada, firstname Chinwe, othernames Obi.
        if (Schema::hasColumn('attendance', 'name')) {
            foreach (DB::table('attendance')->select('id', 'name')->get() as $row) {
                $parts = preg_split('/\s+/', trim((string) $row->name), -1, PREG_SPLIT_NO_EMPTY) ?: [];

                DB::table('attendance')->where('id', $row->id)->update([
                    'surname'    => array_shift($parts) ?? '',
                    'firstname'  => array_shift($parts) ?? '',
                    'othernames' => $parts ? implode(' ', $parts) : null,
                ]);
            }

            Schema::table('attendance', fn (Blueprint $table) => $table->dropColumn('name'));
        }

        // 4. Drop columns the final format doesn't use.
        Schema::table('attendance', function (Blueprint $table) {
            foreach (['whatsapp_number', 'email'] as $column) {
                if (Schema::hasColumn('attendance', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('attendance')) {
            return;
        }

        Schema::table('attendance', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance', 'name')) {
                $table->string('name')->nullable()->after('id');
            }
        });

        foreach (DB::table('attendance')->select('id', 'surname', 'firstname', 'othernames')->get() as $row) {
            DB::table('attendance')->where('id', $row->id)->update([
                'name' => trim("{$row->surname} {$row->firstname} {$row->othernames}"),
            ]);
        }

        Schema::table('attendance', function (Blueprint $table) {
            $table->dropColumn(['surname', 'firstname', 'othernames']);
        });
    }
};
