/* eslint-disable eqeqeq */

(function iiv() {
    function Ranking(max) {
        this.NO_RANK = '';
        this.max = max;
    }
    function isMissing(value) {
        return value === null || value === undefined || value < 0;
    }
    Ranking.prototype.absoluteRank = function absoluteRank(value) {
        if (isMissing(value)) {
        // if (value < 0) {
            return this.NO_RANK;
        }
        return `${value + 1}. out of ${this.max}`;
    };

    Ranking.prototype.relative = function relative(value) {
        // if (value + 1 > this.max / 2.0) {
        //     return (value + 1.0) / this.max;
        // }
        if (isMissing(value)) {
            // if (value < 0) {
            return this.NO_RANK;
        }
        return value / this.max;
    };
    Ranking.prototype.formatRank = function formatRank(value) {
        const abs = this.absoluteRank(value);
        if (this.NO_RANK === abs) {
            return '--';
        }
        const relative = this.relativeRank(value);
        if (this.NO_RANK == relative) {
            return abs;
        }
        return `${abs} [${relative}]`;
    };

    function intToHex(num) {
        if (num < 0 || num > 255) {
            throw new Error(`illegal byte value: ${num}`);
        }
        const r = Number(num)
            .toString(16);
        return (r.length == 1) ? `0${r}` : r;
    }

    Ranking.prototype.relativeRank = function relativeRank(value) {
        if (isMissing(value)) {
            return this.NO_RANK;
        }

        const relative = this.relative(value);

        if (relative <= 0.05) {
            return 'top 5%';
        }
        if (relative <= 0.10) {
            return 'top 10%';
        }
        if (relative <= 0.25) {
            return 'top 25%';
        }
        if (relative >= 0.95) {
            return 'bottom 5%';
        }
        if (relative >= 0.90) {
            return 'bottom 10%';
        }
        if (relative >= 0.75) {
            return 'bottom 25%';
        }

        return this.NO_RANK;
    };

    Ranking.prototype.toRGB = function toRGB(value) {
        const relative = this.relative(value);

        /**
         * 100 is for high abundant 0 for low abundant
         */
        let rank = 100 - Math.round(relative * 100);

        if (rank < 0) {
            rank = 0;
        } else if (rank > 100) {
            rank = 100;
        }
        const R = 250 - rank;
        const GB = Math.round(230 - (rank * 2.3));

        return (`#${intToHex(R)}${intToHex(GB)}${intToHex(GB)}`).toUpperCase();
    };

    function valueToString(rawAbundance) {
        const forceFloat = parseFloat(rawAbundance);
        const rounded = +forceFloat.toFixed(2);

        if (rounded >= 100) {
            return Math.round(forceFloat);
        }
        if (rounded >= 10) {
            return +forceFloat.toFixed(1);
        }
        if (rounded >= 0.01) {
            return +forceFloat.toFixed(2);
        }
        return '< 0.01';
    }

    function formattedAbundance(rawAbundance) {
        if (!rawAbundance) {
            return 'NA';
        }
        // eslint-disable-next-line prefer-template
        return valueToString(rawAbundance) + ' ppm';
    }

    if (typeof module !== 'undefined' && module.exports) { // Node.js
        module.exports.Ranking = Ranking;
        module.exports.formattedAbundance = formattedAbundance;
    } else if (typeof define !== 'undefined' && define.amd) { // eslint-disable-line no-undef
        // AMD / RequireJS
        define([], function amddefinemod() { // eslint-disable-line no-undef, prefer-arrow-callback
            return Ranking;
        });
    } else { // included directly via <script> tag
        root.Ranking = Ranking; // eslint-disable-line no-undef
    }
}());
