import { iqrBounds, median, zScore } from './stats.js';

const HIGH_THRESHOLD_RATIO = 1.2; // 시세 대비 20%+ 높으면 고가 의심
const LOW_THRESHOLD_RATIO = 1 / HIGH_THRESHOLD_RATIO; // 시세 대비 ~17%+ 낮으면 저가 의심 (품질 리스크 점검용)

/**
 * 견적서를 같은 항목·같은 단지 규모대의 유사 단지 낙찰가 데이터와 비교한다.
 * 판정은 참고용 신호일 뿐이며, 계약 여부는 여전히 입주자대표회의가 결정한다.
 */
export function compareQuote(quote, benchmarks, options = {}) {
  const highThresholdRatio = options.highThresholdRatio ?? HIGH_THRESHOLD_RATIO;
  const lowThresholdRatio = options.lowThresholdRatio ?? LOW_THRESHOLD_RATIO;

  const pool = benchmarks.filter(
    (b) => b.category === quote.category && b.complexSizeBand === quote.complexSizeBand,
  );

  if (pool.length === 0) {
    return {
      quoteId: quote.id,
      category: quote.category,
      vendor: quote.vendor,
      complexSizeBand: quote.complexSizeBand,
      verdict: 'NO_BENCHMARK',
      description: `${quote.category}(${quote.complexSizeBand}) 규모의 비교 가능한 유사 단지 낙찰 데이터가 없어 판단할 수 없습니다.`,
      reference: { benchmarkSampleSize: 0 },
    };
  }

  const benchmarkRates = pool.map((b) => b.amount / b.periodMonths);
  const quoteRate = quote.amount / quote.periodMonths;
  const benchmarkMedianRate = median(benchmarkRates);
  const ratioToMedian = quoteRate / benchmarkMedianRate;
  const bounds = iqrBounds(benchmarkRates);

  const verdict = ratioToMedian >= highThresholdRatio ? 'HIGH' : ratioToMedian <= lowThresholdRatio ? 'LOW' : 'NORMAL';

  const descriptionByVerdict = {
    HIGH: `${quote.category}(${quote.complexSizeBand}) 견적(${quote.vendor})이 유사 단지 낙찰가 대비 ${((ratioToMedian - 1) * 100).toFixed(1)}% 높습니다.`,
    NORMAL: `${quote.category}(${quote.complexSizeBand}) 견적(${quote.vendor})은 유사 단지 낙찰가 대비 적정 범위입니다.`,
    LOW: `${quote.category}(${quote.complexSizeBand}) 견적(${quote.vendor})이 유사 단지 낙찰가 대비 ${((1 - ratioToMedian) * 100).toFixed(1)}% 낮습니다. 이례적으로 낮은 견적은 품질/누락 항목 확인이 필요할 수 있습니다.`,
  };

  return {
    quoteId: quote.id,
    category: quote.category,
    vendor: quote.vendor,
    complexSizeBand: quote.complexSizeBand,
    verdict,
    description: descriptionByVerdict[verdict],
    reference: {
      quoteAmount: quote.amount,
      quoteMonthlyRate: Math.round(quoteRate),
      benchmarkSampleSize: pool.length,
      benchmarkMedianRate: Math.round(benchmarkMedianRate),
      ratioToMedian: Number(ratioToMedian.toFixed(3)),
      highThresholdRatio,
      lowThresholdRatio: Number(lowThresholdRatio.toFixed(3)),
      benchmarkMonthlyRates: benchmarkRates.map(Math.round),
      iqrBounds: bounds,
      zScoreVsBenchmark: Number(zScore(quoteRate, benchmarkRates).toFixed(2)),
    },
  };
}

export function compareQuotes(quotes, benchmarks) {
  return quotes.map((quote) => compareQuote(quote, benchmarks));
}
