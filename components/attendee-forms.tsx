"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, User } from "lucide-react"

interface CustomField {
  id: number
  field_name: string
  field_label: string
  field_type: string
  is_required: boolean
  sort_order: number
  options: Array<{
    id: number
    value: string
    label: string
    sort_order: number
  }>
}

interface AttendeeFormProps {
  eventId: number
  totalTickets: number
  customerData: {
    name: string
    email: string
    phone: string
  }
  onAttendeeDataChange: (attendeeData: any[]) => void
}

export function AttendeeForms({ eventId, totalTickets, customerData, onAttendeeDataChange }: AttendeeFormProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [attendeeData, setAttendeeData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buyerDataCopiedToIndex, setBuyerDataCopiedToIndex] = useState<number | null>(null)

  // Load custom fields
  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/custom-fields`)
        const result = await response.json()
        
        if (result.success) {
          setCustomFields(result.data)
        }
      } catch (error) {
        console.error("Error loading custom fields:", error)
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      loadCustomFields()
    }
  }, [eventId])

  // Initialize attendee data when totalTickets changes
  useEffect(() => {
    if (totalTickets > 0) {
      const newAttendeeData = Array.from({ length: totalTickets }, (_, index) => ({
        index: index + 1,
        name: "",
        email: "",
        phone: "",
        customAnswers: {} as Record<string, string>
      }))
      setAttendeeData(newAttendeeData)
      setBuyerDataCopiedToIndex(null)
    } else {
      setAttendeeData([])
    }
  }, [totalTickets])

  // Notify parent component when attendee data changes
  useEffect(() => {
    onAttendeeDataChange(attendeeData)
  }, [attendeeData, onAttendeeDataChange])

  const updateAttendeeField = (index: number, field: string, value: string) => {
    setAttendeeData(prev => prev.map((attendee, i) => {
      if (i === index) {
        if (field.startsWith('custom_')) {
          // Extract custom field ID from field name like "custom_26_0"
          const parts = field.split('_')
          const customFieldId = parts[1] // Get the field ID (e.g., "26")
          return {
            ...attendee,
            customAnswers: {
              ...attendee.customAnswers,
              [customFieldId]: value
            }
          }
        } else {
          return {
            ...attendee,
            [field]: value
          }
        }
      }
      return attendee
    }))

    // Reset copy status if data is manually edited
    if (buyerDataCopiedToIndex === index) {
      setBuyerDataCopiedToIndex(null)
    }
  }

  const copyBuyerData = (index: number) => {
    setAttendeeData(prev => prev.map((attendee, i) => {
      if (i === index) {
        return {
          ...attendee,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone
        }
      }
      return attendee
    }))
    setBuyerDataCopiedToIndex(index)
  }

  const renderCustomField = (field: CustomField, attendeeIndex: number) => {
    const fieldId = `custom_${field.id}_${attendeeIndex}`
    const value = attendeeData[attendeeIndex]?.customAnswers?.[field.id.toString()] || ""

    if (field.field_type === 'dropdown') {
      return (
        <div key={field.id}>
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
          </Label>
          <select
            id={fieldId}
            value={value}
            onChange={(e) => updateAttendeeField(attendeeIndex, fieldId, e.target.value)}
            className="w-full p-2 border rounded-md"
            aria-label={field.field_label}
          >
            <option value="">-- Pilih Opsi --</option>
            {field.options.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )
    } else if (field.field_type === 'text') {
      return (
        <div key={field.id}>
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="text"
            value={value}
            onChange={(e) => updateAttendeeField(attendeeIndex, fieldId, e.target.value)}
            className="w-full"
            placeholder={`Masukkan ${field.field_label.toLowerCase()}`}
          />
        </div>
      )
    }

    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Memuat data peserta...</div>
        </CardContent>
      </Card>
    )
  }

  if (totalTickets === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Data Peserta ({totalTickets} {totalTickets === 1 ? 'orang' : 'orang'})
          </CardTitle>
        </CardHeader>
      </Card>

      {attendeeData.map((attendee, index) => (
        <Card key={index} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Peserta {index + 1}</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyBuyerData(index)}
                disabled={buyerDataCopiedToIndex !== null && buyerDataCopiedToIndex !== index}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Salin dari Data Pembeli
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`name_${index}`} className="text-sm font-medium">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`name_${index}`}
                  type="text"
                  value={attendee.name}
                  onChange={(e) => updateAttendeeField(index, 'name', e.target.value)}
                  className="w-full"
                  placeholder="Nama lengkap peserta"
                />
              </div>
              <div>
                <Label htmlFor={`email_${index}`} className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`email_${index}`}
                  type="email"
                  value={attendee.email}
                  onChange={(e) => updateAttendeeField(index, 'email', e.target.value)}
                  className="w-full"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor={`phone_${index}`} className="text-sm font-medium">
                Nomor Telepon <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`phone_${index}`}
                type="tel"
                value={attendee.phone}
                onChange={(e) => updateAttendeeField(index, 'phone', e.target.value)}
                className="w-full"
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-gray-700">Informasi Tambahan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => renderCustomField(field, index))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
