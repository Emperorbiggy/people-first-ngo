<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Pulls a list of phone numbers out of an uploaded sheet, or out of text typed
 * straight into the UI. Shared by the airtime import and manual-purchase flows
 * so both accept exactly the same formats.
 */
class PhoneListParser
{
    private const HEADINGS = ['phonenumber', 'phone', 'phoneno', 'number', 'mobile', 'mobilenumber', 'msisdn', 'tel', 'telephone', 'contact'];

    /**
     * Reads csv/xlsx/xls/ods. Falls back to the first column when no heading is
     * recognised, so a bare list of numbers works too.
     *
     * @return array<int, string>
     */
    public function fromFile(UploadedFile $file): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet()->toArray(null, true, false, false);

        if (empty($sheet)) {
            return [];
        }

        $column   = null;
        $skipHead = false;

        foreach ($sheet[0] ?? [] as $index => $heading) {
            $normalised = preg_replace('/[^a-z]/', '', strtolower((string) $heading));

            if ($normalised !== '' && in_array($normalised, self::HEADINGS, true)) {
                $column   = $index;
                $skipHead = true;
                break;
            }
        }

        $column ??= 0;
        $rows = $skipHead ? array_slice($sheet, 1) : $sheet;

        $numbers = [];

        foreach ($rows as $line) {
            $number = $this->normalise((string) ($line[$column] ?? ''));

            if ($number !== null) {
                $numbers[$number] = true;
            }
        }

        return array_keys($numbers);
    }

    /**
     * Numbers typed or pasted in — separated by newlines, commas, semicolons
     * or spaces, in any mixture.
     *
     * @return array<int, string>
     */
    public function fromText(?string $text): array
    {
        $numbers = [];

        foreach (preg_split('/[\s,;]+/', (string) $text, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $chunk) {
            $number = $this->normalise($chunk);

            if ($number !== null) {
                $numbers[$number] = true;
            }
        }

        return array_keys($numbers);
    }

    /**
     * Restores the leading zero Excel strips from 08012345678, and folds
     * +234/234 forms into the same local number.
     */
    public function normalise(string $value): ?string
    {
        $digits = preg_replace('/\D/', '', $value);

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '234') && strlen($digits) === 13) {
            $digits = '0' . substr($digits, 3);
        }

        if (strlen($digits) === 10 && $digits[0] !== '0') {
            $digits = '0' . $digits;
        }

        return strlen($digits) >= 10 ? $digits : null;
    }
}
