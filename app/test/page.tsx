'use client'
import React, { useState } from 'react';

const JsonBuilder = () => {
  const [fields, setFields] = useState([{ key: '', value: '' }]);

  const handleChange = (index, type, newValue) => {
    const newFields = [...fields];
    newFields[index][type] = newValue;
    setFields(newFields);

    // Add a new field if key is filled and it's the last one
    if (type === 'key' && newValue && index === fields.length - 1) {
      setFields([...newFields, { key: '', value: '' }]);
    }
  };

  const handleSubmit = () => {
    const jsonData = {};
    fields.forEach(({ key, value }) => {
      if (key) jsonData[key] = value;
    });
    console.log(jsonData); // You can use this for further processing
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>Test Page</h2>
      {fields.map((field, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '10px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Key"
            value={field.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            style={{ flex: 1, padding: '5px', color: 'black'  }}
          />
          <input
            type="text"
            placeholder="Value"
            value={field.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            style={{ flex: 1, padding: '5px', color: 'black' }}
          />
        </div>
      ))}

      <button onClick={handleSubmit} style={{ padding: '10px 20px' }}>
        Send Event
      </button>
    </div>
  );
};

export default JsonBuilder;
