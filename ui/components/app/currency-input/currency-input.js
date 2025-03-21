import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import UnitInput from '../../ui/unit-input';
import CurrencyDisplay from '../../ui/currency-display';
import {
  getValueFromWeiHex,
  getWeiHexFromDecimalValue,
} from '../../../helpers/utils/conversions.util';
import { ETH } from '../../../helpers/constants/common';
import { I18nContext } from '../../../contexts/i18n';
import {
  getConversionRate,
  getNativeCurrency,
} from '../../../ducks/metamask/metamask';
import { getCurrentCurrency, getShouldShowFiat } from '../../../selectors';
import { MAX_DECIMAL } from '../../../../shared/constants/decimal';

/**
 * Component that allows user to enter currency values as a number, and props receive a converted
 * hex value in WEI. props.value, used as a default or forced value, should be a hex value, which
 * gets converted into a decimal value depending on the currency (ETH or Fiat).
 *
 * @param options0
 * @param options0.hexValue
 * @param options0.featureSecondary
 * @param options0.onChange
 * @param options0.onPreferenceToggle
 * @param options0.primaryNumberOfDecimals
 */
export default function CurrencyInput({
  hexValue,
  featureSecondary,
  onChange,
  onPreferenceToggle,
  primaryNumberOfDecimals = 8,
}) {
  const t = useContext(I18nContext);

  const preferredCurrency = useSelector(getNativeCurrency);
  const secondaryCurrency = useSelector(getCurrentCurrency);
  const conversionRate = useSelector(getConversionRate);
  const showFiat = useSelector(getShouldShowFiat);
  const hideSecondary = !showFiat;
  const primarySuffix = preferredCurrency || ETH;
  const secondarySuffix = secondaryCurrency.toUpperCase();

  const [isSwapped, setSwapped] = useState(false);
  const [newHexValue, setNewHexValue] = useState(hexValue);

  const shouldUseFiat = () => {
    if (hideSecondary) {
      return false;
    }

    return Boolean(featureSecondary);
  };

  const getDecimalValue = () => {
    const decimalValueString = shouldUseFiat()
      ? getValueFromWeiHex({
          value: hexValue,
          toCurrency: secondaryCurrency,
          conversionRate,
          numberOfDecimals: 2,
        })
      : getValueFromWeiHex({
          value: hexValue,
          toCurrency: ETH,
          numberOfDecimals:
            primaryNumberOfDecimals <= MAX_DECIMAL
              ? primaryNumberOfDecimals
              : MAX_DECIMAL,
        });

    return Number(decimalValueString) || 0;
  };

  const initialDecimalValue = hexValue ? getDecimalValue() : 0;
  const [decimalValue, setDecimalValue] = useState(initialDecimalValue);

  useEffect(() => {
    setNewHexValue(hexValue);
    const newDecimalValue = getDecimalValue();
    setDecimalValue(newDecimalValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexValue]);

  const swap = async () => {
    await onPreferenceToggle(!featureSecondary);
    setSwapped(!isSwapped);
  };

  const handleChange = (newDecimalValue) => {
    const hexValueNew = shouldUseFiat()
      ? getWeiHexFromDecimalValue({
          value: newDecimalValue,
          fromCurrency: secondaryCurrency,
          conversionRate,
          invertConversionRate: true,
        })
      : getWeiHexFromDecimalValue({
          value: newDecimalValue,
          fromCurrency: ETH,
          fromDenomination: ETH,
          conversionRate,
        });

    setNewHexValue(hexValueNew);
    setDecimalValue(newDecimalValue);
    onChange(hexValueNew);
    setSwapped(!isSwapped);
  };

  useEffect(() => {
    if (isSwapped) {
      handleChange(decimalValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwapped]);

  const renderConversionComponent = () => {
    let currency, numberOfDecimals;

    if (hideSecondary) {
      return (
        <div className="currency-input__conversion-component">
          {t('noConversionRateAvailable')}
        </div>
      );
    }

    if (shouldUseFiat()) {
      // Display ETH
      currency = preferredCurrency || ETH;
      numberOfDecimals =
        primaryNumberOfDecimals <= MAX_DECIMAL
          ? primaryNumberOfDecimals
          : MAX_DECIMAL;
    } else {
      // Display Fiat
      currency = secondaryCurrency;
      numberOfDecimals = 2;
    }

    return (
      <CurrencyDisplay
        className="currency-input__conversion-component"
        currency={currency}
        value={newHexValue}
        numberOfDecimals={numberOfDecimals}
      />
    );
  };
  return (
    <UnitInput
      {...{
        hexValue,
        preferredCurrency,
        secondaryCurrency,
        hideSecondary,
        featureSecondary,
        conversionRate,
        onChange,
        onPreferenceToggle,
      }}
      suffix={shouldUseFiat() ? secondarySuffix : primarySuffix}
      onChange={handleChange}
      value={decimalValue}
      actionComponent={
        <div className="currency-input__swap-component" onClick={swap} />
      }
    >
      {renderConversionComponent()}
    </UnitInput>
  );
}

CurrencyInput.propTypes = {
  hexValue: PropTypes.string,
  featureSecondary: PropTypes.bool,
  onChange: PropTypes.func,
  onPreferenceToggle: PropTypes.func,
  primaryNumberOfDecimals: PropTypes.number,
};
